const EARLIEST_PAIRING_MS = Date.UTC(2000, 0, 1);

export const pairedSinceLabel = (pairedAt: number, language: string): string | null => {
  const paired = new Date(pairedAt);
  if (!Number.isFinite(pairedAt) || pairedAt < EARLIEST_PAIRING_MS || Number.isNaN(paired.getTime())) return null;
  return paired.toLocaleDateString(language, { dateStyle: 'medium' });
};
