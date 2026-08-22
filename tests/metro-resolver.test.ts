import { expect, test } from 'bun:test';

test('prefers ESM packages before CommonJS packages', () => {
  const config = require('../metro.config');
  const fields = config.resolver.resolverMainFields as readonly string[];

  expect(fields.indexOf('module')).toBeGreaterThanOrEqual(0);
  expect(fields.indexOf('module')).toBeLessThan(fields.indexOf('main'));
});
