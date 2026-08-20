import type { ArgusMic } from 'argus-mic';

/** Voice is native-only (Nitro does not exist on web/desktop yet). */
export function createArgusMic(): ArgusMic {
  throw new Error('NOT_SUPPORTED|Voice is not supported on this platform');
}