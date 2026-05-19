/** ISO date string → YYYY-MM-DD for HTML date inputs */
export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? date : date.toISOString();
  return d.slice(0, 10);
}
