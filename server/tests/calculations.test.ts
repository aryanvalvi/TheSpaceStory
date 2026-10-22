import { describe, it, expect } from 'vitest';
import {
  roundToPaise,
  toPaise,
  toINR,
  calculateQuantity,
  calculateQuotation,
  type QuotationCalculationInput,
} from '../src/services/calculations/index.js';

describe('Financial Calculation Engine', () => {
  describe('Currency & Paise conversion', () => {
    it('correctly converts INR to paise and back', () => {
      expect(toPaise(100)).toBe(10000);
      expect(toPaise(1250.5)).toBe(125050);
      expect(toINR(125050)).toBe(1250.5);
      expect(roundToPaise(100.49)).toBe(100);
      expect(roundToPaise(100.5)).toBe(101);
    });
  });

  describe('Quantity formulas', () => {
    it('handles manual quantity', () => {
      expect(calculateQuantity('manual', 5)).toBe(5);
    });

    it('handles length_x_width (area)', () => {
      expect(calculateQuantity('length_x_width', 0, { length: 12, width: 10 })).toBe(120);
    });

    it('handles length_x_height (wardrobes, walls)', () => {
      expect(calculateQuantity('length_x_height', 0, { length: 8, height: 9.5 })).toBe(76);
    });

    it('handles length_x_width_x_height (volume)', () => {
      expect(
        calculateQuantity('length_x_width_x_height', 0, { length: 10, width: 4, height: 3 })
      ).toBe(120);
    });

    it('handles count_x_per_unit (e.g. windows/drawers)', () => {
      expect(calculateQuantity('count_x_per_unit', 0, { count: 6, perUnit: 15 })).toBe(90);
    });
  });

  describe('Full Quotation Calculation', () => {
    it('calculates rooms, optional items, taxes, fees, and milestones accurately', () => {
      const input: QuotationCalculationInput = {
        rooms: [
          {
            roomId: 'room-1',
            name: 'Living Room',
            items: [
              {
                itemId: 'item-1',
                quantity: 100, // 100 sqft
                rate: 15000, // ₹150.00 in paise = 15,000 paise
                calculationMethod: 'manual',
                isOptional: false,
                isIncluded: true,
              },
              {
                itemId: 'item-2',
                quantity: 1,
                rate: 500000, // ₹5,000.00 optional chandelier
                calculationMethod: 'manual',
                isOptional: true,
                isIncluded: false, // excluded from total
              },
              {
                itemId: 'item-3',
                quantity: 1,
                rate: 300000, // ₹3,000.00 optional accent chair
                calculationMethod: 'manual',
                isOptional: true,
                isIncluded: true, // included in total
              },
            ],
          },
        ],
        designFees: [
          {
            feeType: 'fixed',
            amount: 2000000, // ₹20,000.00
            isTaxable: true,
          },
        ],
        additionalCharges: [
          {
            amount: 500000, // ₹5,000.00 debris removal
            isTaxable: false,
          },
        ],
        discount: {
          type: 'fixed',
          value: 100000, // ₹1,000.00 discount
        },
        taxConfig: {
          enabled: true,
          type: 'exclusive',
          rate: 18,
          isInterState: false, // Intra-state: CGST 9%, SGST 9%
        },
        paymentMilestones: [
          { description: 'Booking', percentage: 50 },
          { description: 'Completion', percentage: 50 },
        ],
      };

      const result = calculateQuotation(input);

      // Item 1: 100 * 15000 = 1,500,000 paise (₹15,000)
      // Item 2: optional excluded = 0 towards subtotal
      // Item 3: optional included = 300,000 paise (₹3,000)
      // Room 1 Subtotal: 1,800,000 paise (₹18,000)
      expect(result.rooms[0].subtotal).toBe(1800000);
      expect(result.calculationSnapshot.roomsSubtotal).toBe(1800000);

      // Design fee: 2,000,000 paise (₹20,000)
      expect(result.calculationSnapshot.designFeesTotal).toBe(2000000);

      // Subtotal before discount: 1,800,000 + 2,000,000 + 500,000 = 4,300,000
      expect(result.calculationSnapshot.subtotalBeforeDiscount).toBe(4300000);

      // Discount: 100,000 paise
      expect(result.calculationSnapshot.discountAmount).toBe(100000);

      // Subtotal after discount: 4,200,000 paise
      expect(result.calculationSnapshot.subtotalAfterDiscount).toBe(4200000);

      // Taxable amount: 3,700,000 paise (non-taxable additional charges excluded from tax)
      expect(result.calculationSnapshot.taxableAmount).toBe(3700000);

      // 18% GST on 3,700,000 paise = 666,000 paise (₹6,660.00)
      expect(result.calculationSnapshot.taxAmount).toBe(666000);
      expect(result.calculationSnapshot.cgst).toBe(333000); // 9% = 333,000 paise
      expect(result.calculationSnapshot.sgst).toBe(333000); // 9% = 333,000 paise
      expect(result.calculationSnapshot.igst).toBeUndefined();

      // Grand Total: subtotalAfterDiscount (4,200,000) + tax (666,000) = 4,866,000 paise (₹48,660.00)
      expect(result.calculationSnapshot.grandTotal).toBe(4866000);

      // Milestones: 50% of 4,866,000 = 2,433,000 paise each
      expect(result.paymentMilestones[0].amount).toBe(2433000);
      expect(result.paymentMilestones[1].amount).toBe(2433000);
    });

    it('handles inter-state IGST correctly', () => {
      const input: QuotationCalculationInput = {
        rooms: [
          {
            roomId: 'r1',
            name: 'Office',
            items: [
              {
                itemId: 'i1',
                quantity: 1,
                rate: 1000000, // ₹10,000 in paise
                calculationMethod: 'manual',
                isOptional: false,
                isIncluded: true,
              },
            ],
          },
        ],
        designFees: [],
        additionalCharges: [],
        discount: { type: 'none', value: 0 },
        taxConfig: {
          enabled: true,
          type: 'exclusive',
          rate: 18,
          isInterState: true, // IGST
        },
        paymentMilestones: [{ description: 'Full', percentage: 100 }],
      };

      const result = calculateQuotation(input);
      expect(result.calculationSnapshot.taxAmount).toBe(180000); // 18% of 1,000,000
      expect(result.calculationSnapshot.igst).toBe(180000);
      expect(result.calculationSnapshot.cgst).toBeUndefined();
      expect(result.calculationSnapshot.sgst).toBeUndefined();
      expect(result.calculationSnapshot.grandTotal).toBe(1180000);
    });

    it('calculates per_sqft design fees using explicit sqft and ratePerSqft (e.g. 1200 sqft @ ₹80/sqft = ₹96,000)', () => {
      const input: QuotationCalculationInput = {
        rooms: [
          {
            roomId: 'r1',
            name: 'Living',
            items: [
              {
                itemId: 'i1',
                quantity: 1,
                rate: 10000000, // ₹1,00,000.00
                calculationMethod: 'manual',
                isOptional: false,
                isIncluded: true,
              },
            ],
          },
        ],
        designFees: [
          {
            description: 'Interior Designer Professional Fees',
            feeType: 'per_sqft',
            amount: 9600000, // ₹96,000 in paise
            sqft: 1200,
            ratePerSqft: 8000, // ₹80 in paise
            isTaxable: true,
          },
        ],
        additionalCharges: [],
        discount: { type: 'none', value: 0 },
        taxConfig: {
          enabled: false,
          type: 'exclusive',
          rate: 18,
          isInterState: false,
        },
        paymentMilestones: [{ description: 'Full', percentage: 100 }],
      };

      const result = calculateQuotation(input);
      // 1200 * 8000 = 9,600,000 paise (₹96,000.00)
      expect(result.calculationSnapshot.designFeesTotal).toBe(9600000);
      expect(result.designFees[0].calculatedAmount).toBe(9600000);
      // Grand total = 10,000,000 + 9,600,000 = 19,600,000 paise (₹1,96,000.00)
      expect(result.calculationSnapshot.grandTotal).toBe(19600000);
    });
  });
});
