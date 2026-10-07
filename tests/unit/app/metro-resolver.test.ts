import { describe, expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';

type Resolution = { type: string; filePath?: string };
type ResolveContext = {
  originModulePath: string;
  resolveRequest: (context: ResolveContext, moduleName: string, platform: string) => Resolution;
};
type MetroConfig = {
  resolver: {
    resolveRequest: (context: ResolveContext, moduleName: string, platform: string) => Resolution;
  };
};

const root = join(import.meta.dir, '..', '..', '..');
const load = createRequire(join(root, 'package.json'));
const config = load('./metro.config.js') as MetroConfig;
const fallback: Resolution = { type: 'fallback' };
const context: ResolveContext = {
  originModulePath: join(root, 'node_modules', 'whatwg-url-without-unicode', 'lib', 'url-state-machine.js'),
  resolveRequest: () => fallback,
};

describe('the native bundle resolves punycode to its CommonJS build', () => {
  test('the URL polyfill LiveKit installs gets punycode.ucs2, so parsing a URL never throws', () => {
    const resolved = config.resolver.resolveRequest(context, 'punycode', 'android');
    expect(resolved.type).toBe('sourceFile');
    const punycode = load(resolved.filePath ?? '') as { ucs2?: { decode?: unknown } };
    expect(typeof punycode.ucs2?.decode).toBe('function');
  });

  test('every other module keeps the default resolution', () => {
    expect(config.resolver.resolveRequest(context, 'react', 'android')).toBe(fallback);
  });
});
