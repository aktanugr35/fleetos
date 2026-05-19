/**
 * Format cents as USD with thousand separators (e.g. $10,013.00)
 */
export function formatMoneyCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
