import { existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'modules', 'argus-net');
const link = join(root, 'node_modules', 'argus-net');

if (existsSync(link)) {
  if (lstatSync(link).isSymbolicLink()) {
    process.exit(0);
  }
  rmSync(link, { recursive: true, force: true });
}
symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
