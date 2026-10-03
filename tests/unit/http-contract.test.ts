import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { envelopeSchema, HTTP_CONTRACTS } from '@/core/contracts/http.contract';

type Probe = {
  method: string;
  route: string;
  probe: string;
  response: { status: number; json: unknown };
};

const FIXTURES = join(import.meta.dir, '../../../backend/scripts/fixtures/http');
const MASKED_STRINGS = new Set(['accessToken', 'refreshToken', 'token', 'capability', 'challengeId']);

const probes: Probe[] = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
  .flatMap((file) => (JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as { probes: Probe[] }).probes);

function unmask(value: unknown, key = ''): unknown {
  if (typeof value === 'string' && value.startsWith('<masked')) return MASKED_STRINGS.has(key) ? value : 0;
  if (Array.isArray(value)) return value.map((item) => unmask(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, unmask(item, field)]));
  }
  return value;
}

const recorded = probes.filter(
  (probe) => probe.route !== '/health' && probe.response.json !== null && typeof probe.response.json === 'object'
);

describe('backend fixtures honour the app contracts', () => {
  test('there are recordings to check', () => {
    expect(recorded.length).toBeGreaterThan(50);
  });

  test('every JSON response is the {status, info, errors} envelope', () => {
    const failures = recorded
      .filter((probe) => !envelopeSchema.safeParse(probe.response.json).success)
      .map((probe) => `${probe.method} ${probe.route} (${probe.probe})`);
    expect(failures).toEqual([]);
  });

  for (const [route, schema] of Object.entries(HTTP_CONTRACTS)) {
    test(`${route} matches the shape the app reads`, () => {
      const successes = recorded.filter(
        (probe) =>
          `${probe.method} ${probe.route}` === route && probe.response.status >= 200 && probe.response.status < 300
      );
      expect(successes.length).toBeGreaterThan(0);
      for (const probe of successes) {
        const envelope = envelopeSchema.parse(probe.response.json);
        const parsed = schema.safeParse(unmask(envelope.info));
        expect(parsed.success ? null : `${probe.probe}: ${parsed.error.message}`).toBeNull();
      }
    });
  }
});
