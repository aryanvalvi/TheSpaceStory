/**
 * Financial Calculation Engine for The Space Story
 *
 * All money values are in paise (1 INR = 100 paise) stored as integers.
 * This eliminates floating-point errors in financial computations.
 *
 * Rounding policy: Round half-up at line level before summing.
 */

// ─── Currency Helpers ───────────────────────────────────────────────

/**
 * Round a number to the nearest paisa using round-half-up.
 */
export function roundToPaise(value: number): number {
  return Math.round(value);
}

/**
 * Convert a display amount (INR) to paise.
 */
export function toPaise(inr: number): number {
  return roundToPaise(inr * 100);
}

/**
 * Convert paise to display amount (INR).
 */
export function toINR(paise: number): number {
  return paise / 100;
}

// ─── Quantity Calculation ───────────────────────────────────────────

export interface Dimensions {
  length?: number;
  width?: number;
  height?: number;
  count?: number;
  perUnit?: number;
}

export type CalculationMethod =
  | 'manual'
  | 'length_x_width'
  | 'length_x_height'
  | 'length_x_width_x_height'
  | 'count_x_per_unit';

/**
 * Calculate quantity based on the calculation method and dimensions.
 * Returns the calculated quantity.
 */
export function calculateQuantity(
  method: CalculationMethod,
  manualQuantity: number,
  dimensions?: Dimensions
): number {
  if (method === 'manual' || !dimensions) {
    return manualQuantity;
  }

  switch (method) {
    case 'length_x_width': {
      const l = dimensions.length ?? 0;
      const w = dimensions.width ?? 0;
      if (l <= 0 || w <= 0) return 0;
      return l * w;
    }
    case 'length_x_height': {
      const l = dimensions.length ?? 0;
      const h = dimensions.height ?? 0;
      if (l <= 0 || h <= 0) return 0;
      return l * h;
    }
    case 'length_x_width_x_height': {
      const l = dimensions.length ?? 0;
      const w = dimensions.width ?? 0;
      const h = dimensions.height ?? 0;
      if (l <= 0 || w <= 0 || h <= 0) return 0;
      return l * w * h;
    }
    case 'count_x_per_unit': {
      const count = dimensions.count ?? 0;
      const per = dimensions.perUnit ?? 0;
      if (count <= 0 || per <= 0) return 0;
      return count * per;
    }
    default:
      return manualQuantity;
  }
}

// ─── Line Item Calculation ──────────────────────────────────────────

export interface LineItemInput {
  quantity: number;
  rate: number; // in paise
  dimensions?: Dimensions;
  calculationMethod: CalculationMethod;
  isOptional: boolean;
  isIncluded: boolean;
}

export interface LineItemResult {
  calculatedQuantity: number;
  amount: number; // in paise
}

/**
 * Calculate a single line item's quantity and amount.
 */
export function calculateLineItem(item: LineItemInput): LineItemResult {
  const calculatedQuantity = calculateQuantity(
    item.calculationMethod,
    item.quantity,
    item.dimensions
  );

  const amount = roundToPaise(calculatedQuantity * item.rate);

  return { calculatedQuantity, amount };
}

// ─── Room Subtotal ──────────────────────────────────────────────────

export interface RoomItemInput extends LineItemInput {
  itemId: string;
}

/**
 * Calculate room subtotal.
 * Only includes non-optional items and selected (isIncluded) optional items.
 */
export function calculateRoomSubtotal(items: RoomItemInput[]): number {
  let subtotal = 0;
  for (const item of items) {
    const { amount } = calculateLineItem(item);
    // Include if: not optional, OR optional AND included
    if (!item.isOptional || item.isIncluded) {
      subtotal += amount;
    }
  }
  return subtotal;
}

// ─── Design Fees ────────────────────────────────────────────────────

export interface DesignFeeInput {
  description?: string;
  feeType: 'fixed' | 'percentage' | 'per_sqft';
  amount: number; // paise for fixed/per_sqft, percentage for percentage
  sqft?: number;
  ratePerSqft?: number; // paise per sqft
  isTaxable: boolean;
}

export function calculateDesignFee(
  fee: DesignFeeInput,
  roomsSubtotal: number,
  carpetAreaSqFt?: number
): number {
  switch (fee.feeType) {
    case 'fixed':
      return roundToPaise(fee.amount);
    case 'percentage': {
      const pct = fee.amount > 100 ? fee.amount / 100 : fee.amount;
      return roundToPaise((roomsSubtotal * pct) / 100);
    }
    case 'per_sqft': {
      if (typeof fee.sqft === 'number' && fee.sqft > 0 && typeof fee.ratePerSqft === 'number') {
        return roundToPaise(fee.sqft * fee.ratePerSqft);
      }
      if (typeof fee.sqft === 'number' && fee.sqft > 0 && fee.amount > 0) {
        return roundToPaise(fee.sqft * fee.amount);
      }
      if (carpetAreaSqFt && carpetAreaSqFt > 0 && fee.amount > 0) {
        return roundToPaise(carpetAreaSqFt * fee.amount);
      }
      return roundToPaise(fee.amount || 0);
    }
    default:
      return 0;
  }
}

export function calculateDesignFeesTotal(
  fees: DesignFeeInput[],
  roomsSubtotal: number,
  carpetAreaSqFt?: number
): { total: number; calculatedFees: Array<DesignFeeInput & { calculatedAmount: number }> } {
  let total = 0;
  const calculatedFees = fees.map((fee) => {
    const calculatedAmount = calculateDesignFee(fee, roomsSubtotal, carpetAreaSqFt);
    total += calculatedAmount;
    return { ...fee, calculatedAmount };
  });
  return { total, calculatedFees };
}

// ─── Additional Charges ─────────────────────────────────────────────

export interface AdditionalChargeInput {
  amount: number; // in paise
  isTaxable: boolean;
}

export function calculateAdditionalCharges(charges: AdditionalChargeInput[]): {
  total: number;
  taxableTotal: number;
  nonTaxableTotal: number;
} {
  let total = 0;
  let taxableTotal = 0;
  let nonTaxableTotal = 0;

  for (const charge of charges) {
    const amount = roundToPaise(charge.amount);
    total += amount;
    if (charge.isTaxable) {
      taxableTotal += amount;
    } else {
      nonTaxableTotal += amount;
    }
  }

  return { total, taxableTotal, nonTaxableTotal };
}

// ─── Discount ───────────────────────────────────────────────────────

export interface DiscountInput {
  type: 'none' | 'fixed' | 'percentage';
  value: number; // paise for fixed, percentage for percentage
}

/**
 * Calculate discount amount.
 * Discount base = roomsSubtotal + designFeesTotal + taxable additional charges.
 * Discount cannot exceed the base (no negative taxable amount).
 */
export function calculateDiscount(
  discount: DiscountInput,
  discountBase: number
): number {
  if (discount.type === 'none' || discount.value <= 0) {
    return 0;
  }

  let discountAmount: number;

  if (discount.type === 'fixed') {
    discountAmount = roundToPaise(discount.value);
  } else {
    // percentage
    const cappedPercentage = Math.min(discount.value, 100);
    discountAmount = roundToPaise(discountBase * cappedPercentage / 100);
  }

  // Cannot exceed base
  return Math.min(discountAmount, discountBase);
}

// ─── Tax Calculation ────────────────────────────────────────────────

export interface TaxConfigInput {
  enabled: boolean;
  type: 'exclusive' | 'inclusive';
  rate: number; // percentage
  isInterState: boolean;
}

export interface TaxResult {
  taxableAmount: number;
  taxAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

/**
 * Calculate tax.
 * For exclusive: tax is added on top.
 * For inclusive: tax is extracted from the amount.
 */
export function calculateTax(
  amount: number,
  taxConfig: TaxConfigInput
): TaxResult {
  if (!taxConfig.enabled || taxConfig.rate <= 0) {
    return { taxableAmount: amount, taxAmount: 0 };
  }

  let taxableAmount: number;
  let taxAmount: number;

  if (taxConfig.type === 'exclusive') {
    taxableAmount = amount;
    taxAmount = roundToPaise(amount * taxConfig.rate / 100);
  } else {
    // inclusive: extract tax from the total
    taxableAmount = roundToPaise(amount * 100 / (100 + taxConfig.rate));
    taxAmount = amount - taxableAmount;
  }

  const result: TaxResult = { taxableAmount, taxAmount };

  if (taxConfig.isInterState) {
    result.igst = taxAmount;
  } else {
    result.cgst = roundToPaise(taxAmount / 2);
    result.sgst = taxAmount - result.cgst; // Ensure they sum exactly
  }

  return result;
}

// ─── Payment Milestones ─────────────────────────────────────────────

export interface PaymentMilestoneInput {
  description: string;
  percentage: number;
}

export function calculatePaymentMilestones(
  milestones: PaymentMilestoneInput[],
  grandTotal: number
): Array<PaymentMilestoneInput & { amount: number }> {
  return milestones.map((m) => ({
    ...m,
    amount: roundToPaise(grandTotal * m.percentage / 100),
  }));
}

// ─── Full Quotation Calculation ─────────────────────────────────────

export interface QuotationCalculationInput {
  rooms: Array<{
    roomId: string;
    name: string;
    items: RoomItemInput[];
  }>;
  designFees: DesignFeeInput[];
  additionalCharges: AdditionalChargeInput[];
  discount: DiscountInput;
  taxConfig: TaxConfigInput;
  paymentMilestones: PaymentMilestoneInput[];
  carpetAreaSqFt?: number;
}

export interface QuotationCalculationResult {
  rooms: Array<{
    roomId: string;
    name: string;
    items: Array<RoomItemInput & { calculatedQuantity: number; amount: number }>;
    subtotal: number;
  }>;
  designFees: Array<DesignFeeInput & { calculatedAmount: number }>;
  calculationSnapshot: {
    roomsSubtotal: number;
    designFeesTotal: number;
    additionalChargesTotal: number;
    subtotalBeforeDiscount: number;
    discountAmount: number;
    subtotalAfterDiscount: number;
    taxableAmount: number;
    taxAmount: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    grandTotal: number;
  };
  paymentMilestones: Array<PaymentMilestoneInput & { amount: number }>;
}

/**
 * Calculate the full quotation.
 * This is the single source of truth for all financial computations.
 */
export function calculateQuotation(
  input: QuotationCalculationInput
): QuotationCalculationResult {
  // 1. Calculate rooms
  let roomsSubtotal = 0;
  const calculatedRooms = input.rooms.map((room) => {
    const calculatedItems = room.items.map((item) => {
      const result = calculateLineItem(item);
      return {
        ...item,
        calculatedQuantity: result.calculatedQuantity,
        quantity: result.calculatedQuantity, // Update quantity to calculated value
        amount: result.amount,
      };
    });

    const subtotal = calculatedItems.reduce((sum, item) => {
      if (!item.isOptional || item.isIncluded) {
        return sum + item.amount;
      }
      return sum;
    }, 0);

    roomsSubtotal += subtotal;

    return {
      roomId: room.roomId,
      name: room.name,
      items: calculatedItems,
      subtotal,
    };
  });

  // 2. Calculate design fees (based on rooms subtotal)
  const { total: designFeesTotal, calculatedFees } = calculateDesignFeesTotal(
    input.designFees,
    roomsSubtotal,
    input.carpetAreaSqFt
  );

  // Calculate taxable design fees total
  const taxableDesignFeesTotal = calculatedFees
    .filter((f) => f.isTaxable)
    .reduce((sum, f) => sum + f.calculatedAmount, 0);

  // 3. Calculate additional charges
  const { total: additionalChargesTotal, taxableTotal: taxableAdditionalCharges, nonTaxableTotal: nonTaxableAdditionalCharges } =
    calculateAdditionalCharges(input.additionalCharges);

  // 4. Calculate discount base (rooms + design fees + taxable additional charges)
  const discountBase = roomsSubtotal + designFeesTotal + taxableAdditionalCharges;
  const subtotalBeforeDiscount = roomsSubtotal + designFeesTotal + additionalChargesTotal;

  // 5. Calculate discount
  const discountAmount = calculateDiscount(input.discount, discountBase);

  // 6. Calculate subtotal after discount
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

  // 7. Calculate tax
  // Taxable amount = (rooms + taxable design fees + taxable additional) - proportional discount
  const taxableBase = roomsSubtotal + taxableDesignFeesTotal + taxableAdditionalCharges;
  const proportionalDiscount = taxableBase > 0
    ? roundToPaise(discountAmount * taxableBase / discountBase)
    : 0;
  const taxableAmountForTax = Math.max(0, taxableBase - proportionalDiscount);

  const taxResult = calculateTax(taxableAmountForTax, input.taxConfig);

  // 8. Calculate grand total
  let grandTotal: number;
  if (input.taxConfig.type === 'exclusive') {
    grandTotal = subtotalAfterDiscount + taxResult.taxAmount;
  } else {
    // For inclusive, tax is already part of the amounts
    grandTotal = subtotalAfterDiscount;
  }

  // 9. Calculate payment milestones
  const calculatedMilestones = calculatePaymentMilestones(
    input.paymentMilestones,
    grandTotal
  );

  return {
    rooms: calculatedRooms,
    designFees: calculatedFees,
    calculationSnapshot: {
      roomsSubtotal,
      designFeesTotal,
      additionalChargesTotal,
      subtotalBeforeDiscount,
      discountAmount,
      subtotalAfterDiscount,
      taxableAmount: taxResult.taxableAmount,
      taxAmount: taxResult.taxAmount,
      cgst: taxResult.cgst,
      sgst: taxResult.sgst,
      igst: taxResult.igst,
      grandTotal,
    },
    paymentMilestones: calculatedMilestones,
  };
}
