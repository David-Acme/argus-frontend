import { useConfirmStore } from '@/core/stores';
import type { ConfirmRequest } from '@/core/types';

/**
 * Asks before something irreversible. Awaited like a question, so the caller
 * reads top to bottom: `if (!(await confirm(...))) return;`.
 */
export const confirm = (request: ConfirmRequest): Promise<boolean> =>
  new Promise((resolve) => useConfirmStore.getState().ask(request, resolve));
