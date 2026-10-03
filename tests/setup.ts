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
const iconImports = iconSource.slice(iconSource.indexOf('{') + 1, iconSource.indexOf("} from 'lucide-react-native'"));
const lucideIcons = iconImports.split(',').map((name) => name.trim()).filter(Boolean);

mock.module('lucide-react-native', () =>
  Object.fromEntries(lucideIcons.map((name) => [name, () => null]))
);
