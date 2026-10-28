export const DAY_MS = 86_400_000;

export const startOfLocalDay = (at: number): number => new Date(at).setHours(0, 0, 0, 0);

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
