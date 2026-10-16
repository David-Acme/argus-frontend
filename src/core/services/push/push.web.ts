import type { IPushService } from '@/core/interfaces';

const unsupported: IPushService = {
  register: async () => undefined,
  unpair: async () => undefined,
  onDecline: () => () => undefined,
  drainDeclines: () => undefined,
  sendToBackground: () => undefined,
  notificationsPermitted: async () => false,
  requestNotificationsPermission: async () => false,
  exactAlarmsAllowed: () => false,
  openExactAlarmSettings: () => undefined,
};

export const pushService: IPushService = unsupported;
