import type { InfoRow } from '@/features/auth/model/info-row';

export const INVITATION_ROWS: readonly InfoRow[] = [
  {
    key: 'face',
    icon: 'face',
    title: 'screens.invitation.face.title',
    meta: 'screens.invitation.face.meta',
  },
  {
    key: 'yours',
    icon: 'lock',
    title: 'screens.invitation.yours.title',
    meta: 'screens.invitation.yours.meta',
  },
];
