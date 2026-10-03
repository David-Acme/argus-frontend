import { useConfirmStore } from '@/core/stores';
import type { ConfirmRequest } from '@/core/types';

export const confirm = (request: ConfirmRequest): Promise<boolean> =>
  new Promise((resolve) => useConfirmStore.getState().ask(request, resolve));
