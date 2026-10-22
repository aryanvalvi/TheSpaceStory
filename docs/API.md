# The Space Story — API Reference

## Base URL

```
http://localhost:3001/api
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Success (paginated)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Missing or invalid auth |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Version conflict / duplicate |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Authentication

### POST /api/auth/login
Login with email and password. Sets httpOnly JWT cookie.

**Body:**
```json
{
  "email": "owner@thespacestory.in",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "...", "email": "...", "role": "owner" }
  }
}
```

### POST /api/auth/logout
Clears the auth cookie.

**Response (200):**
```json
{ "success": true, "data": { "message": "Logged out" } }
```

### GET /api/auth/me
Returns the currently authenticated user.

**Response (200):**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "...", "email": "...", "role": "owner" }
}
```

---

## Clients

### GET /api/clients
List clients with optional search and pagination.

**Query params:** `?search=john&page=1&limit=20`

### POST /api/clients
Create a new client.

**Body:**
```json
{
  "name": "John Doe",
  "phone": "+91 98765 43210",
  "email": "john@example.com",
  "billingAddress": {
    "line1": "123 Park Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "notes": "Referred by existing client"
}
```

### GET /api/clients/:id
Get client by ID.

### PATCH /api/clients/:id
Update client fields.

### DELETE /api/clients/:id
Delete client (only if no linked projects exist).

---

## Projects

### GET /api/projects
List projects. Filter by `?clientId=...&status=active&search=...&page=1&limit=20`

### POST /api/projects
Create a new project.

**Body:**
```json
{
  "clientId": "...",
  "projectName": "4BHK Apartment Renovation",
  "propertyType": "apartment",
  "siteAddress": {
    "line1": "Flat 1203, Tower B",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411006"
  },
  "carpetAreaSqFt": 2200,
  "projectNotes": "Heritage building, structural changes limited"
}
```

### GET /api/projects/:id
Get project by ID (includes client info).

### PATCH /api/projects/:id
Update project fields.

---

## Catalogue

### GET /api/catalogue
List catalogue items. Filter by `?category=carpentry&search=wardrobe&active=true&page=1&limit=50`

### POST /api/catalogue
Create a catalogue item.

**Body:**
```json
{
  "name": "Sliding Wardrobe",
  "category": "carpentry",
  "description": "Full-height sliding wardrobe with mirror panel",
  "defaultUnit": "sqft",
  "defaultRate": 185000,
  "defaultTaxConfig": { "rate": 18, "type": "exclusive" },
  "defaultSpecifications": "18mm BWP plywood, laminate finish",
  "defaultQuantityFormula": "length_x_height"
}
```

### GET /api/catalogue/:id
Get catalogue item by ID.

### PATCH /api/catalogue/:id
Update catalogue item.

### DELETE /api/catalogue/:id
Archive catalogue item (sets `active: false`).

---

## Quotations

### GET /api/quotations
List quotations. Filter by `?projectId=...&status=draft&search=...&page=1&limit=20`

### POST /api/quotations
Create a new draft quotation.

**Body:** Full quotation payload (rooms, items, fees, discounts, terms, etc.)

### GET /api/quotations/:id
Get full quotation by ID.

### PATCH /api/quotations/:id
Update a draft quotation. Requires `version` field for optimistic concurrency.

**Body:**
```json
{
  "version": 3,
  "rooms": [ ... ],
  "discountConfig": { ... },
  ...
}
```

### POST /api/quotations/calculate
Calculate totals without persisting. Returns a full calculation result.

**Body:** Same payload as create/update (rooms, items, fees, discounts, taxes).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "roomId": "...",
        "name": "Living Room",
        "items": [
          { "itemId": "...", "quantity": 80, "amount": 14800000, ... }
        ],
        "subtotal": 14800000
      }
    ],
    "calculationSnapshot": {
      "roomsSubtotal": 35600000,
      "designFeesTotal": 5000000,
      "additionalChargesTotal": 1500000,
      "subtotalBeforeDiscount": 42100000,
      "discountAmount": 2100000,
      "subtotalAfterDiscount": 40000000,
      "taxableAmount": 40000000,
      "taxAmount": 7200000,
      "cgst": 3600000,
      "sgst": 3600000,
      "grandTotal": 47200000
    },
    "paymentMilestones": [
      { "description": "Booking advance", "percentage": 40, "amount": 18880000 }
    ]
  }
}
```

### POST /api/quotations/:id/issue
Issue the quotation. Freezes snapshot, assigns issue date.

### POST /api/quotations/:id/revisions
Create a new revision from an issued quotation.

**Response (201):** New draft quotation with incremented revision number.

### POST /api/quotations/:id/approve
Mark an issued quotation as approved.

### POST /api/quotations/:id/reject
Mark an issued quotation as rejected.

### POST /api/quotations/:id/cancel
Cancel a quotation.

### GET /api/quotations/:id/pdf
Download the quotation as a PDF. Streams the file.

**Response headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="TSS-2026-0001-R1.pdf"
```

---

## Settings

### GET /api/settings/studio
Get studio settings.

### PATCH /api/settings/studio
Update studio settings.

**Body:**
```json
{
  "studioName": "The Space Story",
  "phone": "+91 98765 43210",
  "defaultQuotationValidityDays": 30,
  "defaultTaxConfig": {
    "enabled": true,
    "type": "exclusive",
    "rate": 18,
    "isInterState": false
  }
}
```

---

## Health

### GET /api/health
Health check endpoint.

**Response (200):**
```json
{ "status": "ok", "timestamp": "2026-10-21T16:35:16.000Z" }
```
