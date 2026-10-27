export function secondsLeft(expiresAt: number | null, nowMs: number): number {
  if (expiresAt === null) return 0;
  return Math.max(0, Math.floor(expiresAt - nowMs / 1000));
}

export function countdownOf(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
