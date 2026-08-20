import { existsSync, lstatSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const modules = ['argus-net', 'argus-mic', 'argus-face'];

for (const name of modules) {
  const target = join(root, 'modules', name);
  const link = join(root, 'node_modules', name);

  if (existsSync(link)) {
    if (lstatSync(link).isSymbolicLink()) {
      continue;
    }
    rmSync(link, { recursive: true, force: true });
  }
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}