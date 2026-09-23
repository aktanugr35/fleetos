/** Neutralize Excel formula injection on string cells. */
export function excelSafeText(value: string | null | undefined): string {
  const text = String(value ?? '');
  if (/^[=+\-@]/.test(text) || text.startsWith('\t') || text.startsWith('\r')) {
    return `'${text}`;
  }
  return text;
}
