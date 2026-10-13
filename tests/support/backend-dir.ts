import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FRONTEND_ROOT = join(import.meta.dir, '../..');

const SIBLING_BACKEND = join(FRONTEND_ROOT, '../backend');

export function backendRoot(): string {
  const configured = process.env.ARGUS_BACKEND_DIR?.trim();
  const root = configured ? configured : SIBLING_BACKEND;
  if (!existsSync(root)) {
    throw new Error(
      `The backend checkout was not found at ${root}. Set ARGUS_BACKEND_DIR to the backend repository root; ` +
        'without it, the backend beside this frontend checkout is used.'
    );
  }
  return root;
}

export const backendPath = (...segments: string[]): string => join(backendRoot(), ...segments);
