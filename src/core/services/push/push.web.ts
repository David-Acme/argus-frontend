import type { IPushService } from '@/core/interfaces';

const unsupported: IPushService = {
  register: async () => undefined,
  unpair: async () => undefined,
  onDecline: () => () => undefined,
  drainDeclines: () => undefined,
};

export const pushService: IPushService = unsupported;
