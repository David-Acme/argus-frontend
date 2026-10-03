const INVITE_SLOT_TTL_MS = 10 * 60_000;

let slot: { token: string; expiresAt: number } | null = null;

export function holdInviteToken(token: string, now = Date.now()): void {
  slot = { token, expiresAt: now + INVITE_SLOT_TTL_MS };
}

export function readInviteToken(now = Date.now()): string | null {
  if (slot && slot.expiresAt <= now) slot = null;
  return slot?.token ?? null;
}

export function clearInviteToken(): void {
  slot = null;
}
