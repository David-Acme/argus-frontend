import type {
  QrScanFeedback,
  QrScanFeedbackDefinition,
  QrScanPurpose,
  QrScanPurposeDefaults,
} from '@/core/types/qr.type';

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
    manualLabel: 'screens.qr.purpose.invite.manual-label',
    manualPlaceholder: 'screens.qr.purpose.invite.manual-placeholder',
    pattern: /^[0-9A-Fa-f]{8,64}$/,
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

export const QR_SCAN_FEEDBACK: Record<QrScanFeedback, QrScanFeedbackDefinition> = {
  requesting: { label: 'screens.qr.feedback.requesting', tone: 'muted', icon: null },
  searching: { label: 'screens.qr.feedback.searching', tone: 'muted', icon: null },
  detected: { label: 'screens.qr.feedback.detected', tone: 'accent', icon: 'check' },
  invalid: { label: 'screens.qr.feedback.invalid', tone: 'error', icon: 'triangle-alert' },
  blocked: { label: 'screens.qr.feedback.blocked', tone: 'error', icon: 'triangle-alert' },
};

export const QR_SCAN_CONFIRM_MS = 450;

export const QR_SCAN_RETRY_MS = 1400;

export const QR_SCAN_PULSE_MS = 220;

export const QR_SCAN_PULSE_SCALE = 0.96;

export const QR_SCAN_CONVERGE_MS = 260;

export const QR_SCAN_CONVERGE_RATIO = 0.11;

export const QR_SCAN_FADE_DELAY_MS = 170;

export const QR_SCAN_FADE_MS = 240;

export const QR_SCAN_DOT_PULSE_MS = 900;

export const QR_SCAN_FRAME_RATIO = 0.68;

export const QR_SCAN_FRAME_MAX = 280;

export const QR_SCAN_SUPPORTING_PANE_MIN_WIDTH = 320;

export const QR_SCAN_SUPPORTING_PANE_MAX_WIDTH = 400;

export const QR_SCAN_SUPPORTING_PANE_RATIO = 0.36;

export const QR_SCAN_FRAME_CORNER_RATIO = 0.17;

export const QR_SCAN_FRAME_BORDER = 2.5;

export const QR_SCAN_FRAME_RADIUS = 24;

export const QR_SCAN_SHEET_RADIUS = 40;

export const QR_SCAN_SHEET_PADDING_BOTTOM = 20;

export const QR_SCAN_TYPING_GAP = 24;

export const QR_SCAN_ICON_MORPH_ROTATION = 90;

export const QR_SCAN_ICON_MORPH_SCALE = 0.65;
