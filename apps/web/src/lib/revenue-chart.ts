/**
 * Normalize API month values for chart aggregation.
 * Safari rejects `new Date("Jul 2026")`, so locale labels must be parsed explicitly.
 */
export function monthKeyFromChartPoint(month: string): string | null {
  const trimmed = month.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }

  const labelMatch = trimmed.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
  if (labelMatch) {
    const date = new Date(`${labelMatch[1]} 1, ${labelMatch[2]}`);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  return null;
}
