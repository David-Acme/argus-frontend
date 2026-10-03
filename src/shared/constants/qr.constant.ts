import type { QrScanPurpose, QrScanPurposeDefaults } from '@/core/types/qr.type';

export const QR_SCAN_PURPOSES: Record<QrScanPurpose, QrScanPurposeDefaults> = {
  server: {
    title: 'screens.qr.purpose.server.title',
    hint: 'screens.qr.purpose.server.hint',
    manualLabel: 'screens.qr.purpose.server.manual-label',
    manualPlaceholder: 'screens.qr.purpose.server.manual-placeholder',
    pattern: null,
    invalidMessage: 'screens.qr.purpose.server.invalid-message',
  },
  invite: {
    title: 'screens.qr.purpose.invite.title',
    hint: 'screens.qr.purpose.invite.hint',
    manualLabel: null,
    manualPlaceholder: null,
    pattern: null,
    invalidMessage: 'screens.qr.purpose.invite.invalid-message',
  },
  generic: {
    title: 'screens.qr.purpose.generic.title',
    hint: 'screens.qr.purpose.generic.hint',
    manualLabel: null,
    manualPlaceholder: null,
    pattern: null,
    invalidMessage: null,
  },
  login: {
    title: 'screens.qr.purpose.login.title',
    hint: 'screens.qr.purpose.login.hint',
    manualLabel: null,
    manualPlaceholder: null,
    pattern: null,
    invalidMessage: 'screens.qr.purpose.login.invalid-message',
  },
};
