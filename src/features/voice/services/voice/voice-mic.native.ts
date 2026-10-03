import { createMic } from 'argus-mic';
import type { ArgusMic } from 'argus-mic';

export function createArgusMic(): ArgusMic {
  return createMic();
}