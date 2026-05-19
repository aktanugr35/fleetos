/** Monetary values are stored as integer cents */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCentsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(centsToDollars(cents));
}

/** Alias used across the web app */
export const formatCurrency = formatCentsToUSD;

export function parseDollarsToCents(value: string | number): number {
  const dollars = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(dollars)) return 0;
  return dollarsToCents(dollars);
}

export function calculatePercentage(amountCents: number, rateHundredths: number): number {
  return Math.round((amountCents * rateHundredths) / 10000);
}

export function calculatePerMile(totalMiles: number, ratePerMileCents: number): number {
  return totalMiles * ratePerMileCents;
}
