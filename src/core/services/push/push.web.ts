import type { IPushService } from '@/core/interfaces';

const unsupported: IPushService = {
  register: async () => undefined,
  bindListeners: () => undefined,
  unpair: async () => undefined,
  onDecline: () => () => undefined,
  onCallControl: () => () => undefined,
  telecomCallActive: () => false,
  startAssistantCall: async () => false,
  callEndpoints: () => [],
  selectCallEndpoint: () => undefined,
  setCallMuted: () => undefined,
  drainDeclines: () => undefined,
  sendToBackground: () => undefined,
  stopOngoingCall: () => undefined,
  ackDecline: () => undefined,
  isKeyguardLocked: () => false,
  overKeyguard: () => false,
  outsideCallId: () => '',
  notificationsPermitted: async () => false,
  requestNotificationsPermission: async () => false,
  exactAlarmsAllowed: () => false,
  openExactAlarmSettings: () => undefined,
  fullScreenAllowed: () => true,
  openFullScreenSettings: () => undefined,
};

export const pushService: IPushService = unsupported;
