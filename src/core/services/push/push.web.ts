import type { IPushService } from '@/core/interfaces';

const unsupported: IPushService = {
  register: async () => undefined,
  bindListeners: () => undefined,
  unpair: async () => undefined,
  onDecline: () => () => undefined,
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
};

export const pushService: IPushService = unsupported;
