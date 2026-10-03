import { mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

Object.assign(globalThis, { window: globalThis });

mock.module('react-native', () => ({
  Platform: {
    OS: 'web',
    select: <T>(options: { web?: T; default?: T }) => options.web ?? options.default,
  },
}));

const iconSource = readFileSync(join(import.meta.dir, '../src/shared/constants/icon.constant.ts'), 'utf8');
for (const [, path] of iconSource.matchAll(/from '(lucide-react-native\/icons\/[a-z0-9-]+)'/g)) {
  mock.module(path, () => ({ default: () => null }));
}
