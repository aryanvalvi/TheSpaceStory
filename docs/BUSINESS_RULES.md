# The Space Story — Business Rules

## 1. Quotation Numbering

- **Format:** `TSS-YYYY-NNNN` (e.g., `TSS-2026-0001`)
- **Sequence:** Year-scoped, auto-incremented via atomic counter
- **Concurrency:** Uses MongoDB `findOneAndUpdate` with `$inc` and `upsert: true`
- **Uniqueness:** Enforced at DB level with unique index on `quotationNumber`
- **Revision:** Displayed as `TSS-2026-0001 R2` (revision suffix is metadata, not part of the number)

## 2. Quotation Statuses & Transitions

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │ issue
                    ┌────▼─────┐
              ┌─────│  issued  │─────┐
              │     └────┬─────┘     │
              │          │           │
         approve      reject      cancel
              │          │           │
         ┌────▼───┐ ┌───▼────┐ ┌───▼──────┐
         │approved│ │rejected│ │cancelled │
         └────────┘ └────────┘ └──────────┘

         Issued quotations also auto-transition to:
         ┌────────┐
         │expired │  (when validUntil < current date)
         └────────┘
```

### Transition Rules
| From | To | Conditions |
|------|-----|-----------|
| draft | issued | All required fields present; recalculation performed |
| issued | approved | Must be current (not expired) |
| issued | rejected | — |
| issued | cancelled | — |
| draft | cancelled | — |
| approved | cancelled | Explicit action only |

### Constraints
- **Draft:** Freely editable
- **Issued:** Immutable through normal update endpoints; changes require a new revision
- **Approved/Rejected/Cancelled:** Terminal states (no further transitions except cancellation of approved)
- **Expired:** Computed at read time from `validUntil`; not stored as a status change

## 3. Revision Rules

- Creating a revision from an issued quotation produces a **new draft** document
- The new draft has `revisionNumber = previous + 1`
- The new draft's `previousRevisionId` points to the issued version
- The original issued quotation remains **completely unchanged**
- Revision chain is traceable via `previousRevisionId` links
- Only the latest revision can be further revised (prevents branching)

## 4. Financial Calculation Rules

### 4.1 Quantity Calculation

| Method | Formula | Example |
|--------|---------|---------|
| manual | User-entered quantity | qty = 5 |
| length_x_width | L × W | 10ft × 12ft = 120 sqft |
| length_x_height | L × H | 10ft × 8ft = 80 sqft (wardrobe front) |
| length_x_width_x_height | L × W × H | 10 × 5 × 3 = 150 cuft |
| count_x_per_unit | count × perUnit | 4 windows × 15 sqft = 60 sqft |

- Dimensions must be positive, finite numbers
- Maximum dimension: 10,000 (configurable)
- Maximum quantity: 100,000 (configurable)

### 4.2 Line Amount
```
lineAmount = roundToPaise(quantity × rate)
```

### 4.3 Optional Items
- Optional items have `isOptional: true`
- `isIncluded` determines if included in totals
- Unselected optional items: calculated for preview, excluded from totals
- Selected optional items: included in room subtotal

### 4.4 Room Subtotal
```
roomSubtotal = sum of (lineAmount for each item where NOT isOptional OR isIncluded)
```

### 4.5 Design Fees
| Fee Type | Calculation |
|----------|------------|
| fixed | Direct amount |
| percentage | `roundToPaise(roomsSubtotal × percentage / 100)` |
| per_sqft | `roundToPaise(carpetArea × ratePerSqft)` |

- Percentage fees are calculated on `roomsSubtotal` only (not on taxes or other fees)

### 4.6 Additional Charges
- Each charge has a fixed amount and a `isTaxable` flag
- Taxable charges are added to the taxable base
- Non-taxable charges are added after tax

### 4.7 Discount
```
if type == 'fixed':
  discountAmount = value
if type == 'percentage':
  discountAmount = roundToPaise(discountBase × percentage / 100)
```

- **Discount base** = roomsSubtotal + designFeesTotal + taxableAdditionalCharges
- Discount cannot exceed the discount base (no negative taxable amount)
- Discount cannot exceed 100% for percentage discounts

### 4.8 Tax Calculation (GST)

**Tax-exclusive pricing (default):**
```
taxableAmount = subtotalAfterDiscount (excluding non-taxable charges)
taxAmount = roundToPaise(taxableAmount × taxRate / 100)
```

**Tax-inclusive pricing:**
```
taxableAmount = roundToPaise(inclusiveAmount × 100 / (100 + taxRate))
taxAmount = inclusiveAmount - taxableAmount
```

**GST Breakdown:**
- Intra-state: CGST = taxAmount / 2, SGST = taxAmount / 2
- Inter-state: IGST = taxAmount

**Item-level tax rates** override the quotation-level default when specified.

### 4.9 Grand Total
```
For tax-exclusive:
  grandTotal = subtotalAfterDiscount + taxAmount + nonTaxableAdditionalCharges

For tax-inclusive:
  grandTotal = subtotalAfterDiscount + nonTaxableAdditionalCharges
  (tax is already included)
```

### 4.10 Payment Milestones
```
milestoneAmount = roundToPaise(grandTotal × milestonePercentage / 100)
```
- Milestones should sum to 100%
- Warn (don't block) if milestone percentages don't total 100%

### 4.11 Rounding Policy
- **Method:** Round half-up (standard commercial rounding)
- **Precision:** 1 paisa (0.01 INR)
- **Application point:** At line-item level, before summing
- **Display:** Always show 2 decimal places for INR amounts

## 5. Currency Formatting

- Symbol: ₹
- Format: ₹1,23,456.78 (Indian numbering system: lakh/crore grouping)
- Thousands separator: comma
- Decimal separator: period
- Always show 2 decimal places

## 6. Quotation Validity

- Default: 30 days from issue date (configurable in studio settings)
- `validUntil = issueDate + defaultQuotationValidityDays`
- Editable at quotation level before issuing
- Expired status is computed, not stored

## 7. Client Data Snapshots

When a quotation is **issued**, the following data is snapshot:
- Client name, phone, email, billing address
- Project name, property type, site address, carpet area
- All item names, descriptions, specifications, rates, units, quantities
- All terms, inclusions, exclusions
- All payment milestones
- Tax configuration and rates

This ensures historical quotation PDFs always reflect the data at issue time.

## 8. Catalogue vs Quotation Items

- Catalogue items provide **defaults** (name, unit, rate, specs, formula)
- When added to a quotation, values are **copied** into the quotation item
- Subsequent changes to catalogue items do **not** affect existing quotation items
- Custom items can be created directly in a quotation without adding to catalogue

## 9. Deletion Rules

| Entity | Deletable? | Condition |
|--------|-----------|-----------|
| Client | Yes | No linked projects |
| Project | No | Soft-delete or archive only |
| CatalogueItem | Archive | Set `active: false` |
| Quotation (draft) | Yes | Only drafts |
| Quotation (issued) | No | Must cancel instead |

## 10. Concurrency Control

- Quotations use an integer `version` field
- Every update requires the current `version` in the request
- Server increments `version` on save
- If versions don't match, return 409 Conflict
- Client must re-fetch and re-apply changes

## 11. Default Values

| Setting | Default |
|---------|---------|
| Currency | INR |
| Tax rate | 18% (GST) |
| Tax type | exclusive |
| Inter-state | false (intra-state) |
| Quotation validity | 30 days |
| Property type | apartment |
| Project status | active |
