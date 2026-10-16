const REASON_MAX = 64;

export function traceReasonOf(value: string): string {
  const shaped = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, REASON_MAX);
  return shaped.length > 0 ? shaped : 'unknown';
}
