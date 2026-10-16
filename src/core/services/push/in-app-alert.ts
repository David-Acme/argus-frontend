export type InAppAlert = {
  intentId: string;
  title: string;
  body: string;
  critical: boolean;
  deepLink: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function parseInAppAlert(raw: string): InAppAlert | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { intentId, title, body, critical, deepLink } = value;
  if (
    typeof intentId !== 'string' ||
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    typeof critical !== 'boolean' ||
    typeof deepLink !== 'string'
  ) {
    return null;
  }
  return { intentId, title, body, critical, deepLink: deepLink.length > 0 ? deepLink : null };
}
