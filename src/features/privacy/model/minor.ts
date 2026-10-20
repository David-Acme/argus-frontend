import type { MinorMark, PrivacyDirectory, UserPrivacy } from '@/core/types';

export const minorPath = (userId: number): string => `/privacy/users/${encodeURIComponent(String(userId))}/minor`;

export type MinorChange = 'mark' | 'unmark' | 'consent' | 'withdraw';

export type MinorStanding = 'adult' | 'minor-protected' | 'minor-consented';

export function minorMarkOf(state: Pick<UserPrivacy, 'minor' | 'guardianConsent'>): MinorMark {
  const minor = state.minor ?? false;
  return { minor, guardianConsent: minor && (state.guardianConsent ?? false) };
}

export function minorStandingOf(mark: MinorMark): MinorStanding {
  if (!mark.minor) return 'adult';
  return mark.guardianConsent ? 'minor-consented' : 'minor-protected';
}

export function minorChangeOf(current: MinorMark, next: MinorMark): MinorChange | null {
  if (current.minor !== next.minor) return next.minor ? 'mark' : 'unmark';
  if (!next.minor || current.guardianConsent === next.guardianConsent) return null;
  return next.guardianConsent ? 'consent' : 'withdraw';
}

export function normalizedMark(mark: MinorMark): MinorMark {
  return { minor: mark.minor, guardianConsent: mark.minor && mark.guardianConsent };
}

function markedUser(user: UserPrivacy, mark: MinorMark): UserPrivacy {
  const next = normalizedMark(mark);
  const protectedMinor = next.minor && !next.guardianConsent;
  return {
    ...user,
    minor: next.minor,
    guardianConsent: next.guardianConsent,
    effective: protectedMinor ? { ...user.effective, faceCameras: false, voiceLearning: false } : user.effective,
  };
}

export function withMinorMark(
  directory: PrivacyDirectory | null,
  userId: number,
  mark: MinorMark
): PrivacyDirectory | null {
  if (!directory) return directory;
  return {
    ...directory,
    users: directory.users.map((user) => (user.userId === userId ? markedUser(user, mark) : user)),
  };
}
