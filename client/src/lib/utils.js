/**
 * Formats paise into Indian Rupee string (₹1,23,456.78)
 */
export function formatINR(paise = 0) {
  if (isNaN(paise) || paise === null) return '₹0.00';
  const inr = (Number(paise) / 100).toFixed(2);
  const [integerPart, decimalPart] = inr.split('.');
  
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `₹${formattedInteger}.${decimalPart}`;
}

/**
 * Convert user INR input string/number to paise integer
 */
export function toPaise(inr) {
  if (!inr && inr !== 0) return 0;
  return Math.round(Number(inr) * 100);
}

/**
 * Convert paise integer to INR number for form fields
 */
export function toINR(paise) {
  if (!paise && paise !== 0) return 0;
  return Number(paise) / 100;
}

/**
 * Formats ISO date to readable Indian format
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Calculates quantity from dimensions on the client side
 */
export function calculateLocalQuantity(method, dimensions, manualQty = 0) {
  if (method === 'manual' || !dimensions) {
    return Number(manualQty) || 0;
  }
  const length = Number(dimensions.length) || 0;
  const width = Number(dimensions.width) || 0;
  const height = Number(dimensions.height) || 0;
  const count = Number(dimensions.count) || 0;
  const perUnit = Number(dimensions.perUnit) || 0;

  switch (method) {
    case 'length_x_width':
      return length * width;
    case 'length_x_height':
      return length * height;
    case 'length_x_width_x_height':
      return length * width * height;
    case 'count_x_per_unit':
      return count * perUnit;
    default:
      return Number(manualQty) || 0;
  }
}

export const CALCULATION_METHOD_LABELS = {
  manual: 'Fixed Count / Piece (Manual Qty)',
  length_x_width: 'Area: Length × Width (Sq. Ft.)',
  length_x_height: 'Area: Length × Height (Sq. Ft.)',
  length_x_width_x_height: 'Volume: L × W × H (Cu. Ft.)',
  count_x_per_unit: 'Count × Per Unit',
};

export const UNIT_LABELS = {
  sqft: 'Sq. Ft.',
  sqm: 'Sq. M.',
  running_ft: 'Running Ft. (RFT)',
  running_m: 'Running M.',
  ft: 'Feet',
  m: 'Meter',
  piece: 'Piece (Nos)',
  set: 'Set',
  day: 'Day',
  hour: 'Hour',
  visit: 'Visit',
  lot: 'Lot (Lump sum)',
  fixed_amount: 'Fixed Amount',
};
