import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendPath } from '@tests/support/backend-dir';
import { readActivityPage } from '@/core/contracts/activity.contract';
import { moduleActionResultSchema, moduleImpactSchema, readModuleList } from '@/core/contracts/modules.contract';
import { envelopeSchema, HTTP_CONTRACTS } from '@/core/contracts/http.contract';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import { readEnvelope } from '@/core/services/http/http-envelope';
import { TABLE_MAPS, toModelProps } from '@/core/services/sync/entity-mappers';

type Probe = {
  method: string;
  route: string;
  probe: string;
  response: { status: number; json: unknown };
};

const FIXTURES = backendPath('scripts/fixtures/http');
const MASKED_STRINGS = new Set(['accessToken', 'refreshToken', 'token', 'capability', 'challengeId']);

const probes: Probe[] = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
  .flatMap((file) => (JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')) as { probes: Probe[] }).probes);

const MASKED_SAMPLES: Readonly<Record<string, string>> = {
  '<masked-hex32>': '0'.repeat(32),
  '<masked-hex64>': '0'.repeat(64),
};

const ARRAY_KEY = '<VOLATILE:array>';
const EMPTY_KEY = '<VOLATILE:mayBeEmpty>';
const OR_NULL_KEY = '<VOLATILE:or-null>';
const VOLATILE_PREFIX = '<VOLATILE:';
const ENUM_PREFIX = 'enum:';
const MASKED_TYPE_PREFIX = '<masked:';

type Sample = () => unknown;

const SAMPLE_BY_TYPE: ReadonlyMap<string, Sample> = new Map<string, Sample>([
  ['number', () => 1],
  ['string', () => 'x'],
  ['boolean', () => false],
  ['object', () => ({})],
  ['array', () => []],
  ['null', () => null],
]);

function sampleOfType(type: string): unknown {
  const sample = SAMPLE_BY_TYPE.get(type);
  if (sample === undefined) throw new Error(`unknown volatile marker type: ${type}`);
  return sample();
}

const isVolatileMarker = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(VOLATILE_PREFIX) && value.endsWith('>');

const isMaskedTyped = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(MASKED_TYPE_PREFIX) && value.endsWith('>');

function alternativesOf(marker: string): Sample[] {
  const body = marker.slice(VOLATILE_PREFIX.length, -1);
  if (body.startsWith(ENUM_PREFIX)) {
    return body
      .slice(ENUM_PREFIX.length)
      .split('|')
      .map((member) => () => member);
  }
  return body.split('|').map((type) => () => sampleOfType(type));
}

function alternativeCount(value: unknown): number {
  if (isVolatileMarker(value)) return alternativesOf(value).length;
  if (Array.isArray(value)) return Math.max(1, ...value.map(alternativeCount));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (OR_NULL_KEY in record) return Math.max(2, alternativeCount(record[OR_NULL_KEY]));
    return Math.max(1, ...Object.values(record).map(alternativeCount));
  }
  return 1;
}

function unmask(value: unknown, pick = 0, key = ''): unknown {
  if (typeof value === 'string' && value in MASKED_SAMPLES) return MASKED_SAMPLES[value];
  if (isMaskedTyped(value)) return sampleOfType(value.slice(MASKED_TYPE_PREFIX.length, -1));
  if (typeof value === 'string' && value.startsWith('<masked')) return MASKED_STRINGS.has(key) ? value : 0;
  if (isVolatileMarker(value)) {
    const alternatives = alternativesOf(value);
    return alternatives[pick % alternatives.length]?.();
  }
  if (Array.isArray(value)) return value.map((item) => unmask(item, pick, key));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (OR_NULL_KEY in record) {
      return pick % 2 === 1 ? null : unmask(record[OR_NULL_KEY], pick, key);
    }
    if (ARRAY_KEY in record) {
      const element = record[ARRAY_KEY];
      return element === null ? [] : [unmask(element, pick, key)];
    }
    return Object.fromEntries(
      Object.entries(record)
        .filter(([field]) => field !== EMPTY_KEY)
        .map(([field, item]) => [field, unmask(item, pick, field)])
    );
  }
  return value;
}

function variantsOf(value: unknown): unknown[] {
  return Array.from({ length: alternativeCount(value) }, (_, pick) => unmask(value, pick));
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

  const successesOf = (route: string) =>
    recorded.filter(
      (probe) =>
        `${probe.method} ${probe.route}` === route && probe.response.status >= 200 && probe.response.status < 300
    );

  for (const [route, schema] of Object.entries(HTTP_CONTRACTS)) {
    test(`${route} matches the shape the app reads`, () => {
      const successes = successesOf(route);
      expect(successes.length).toBeGreaterThan(0);
      for (const probe of successes) {
        const envelope = envelopeSchema.parse(probe.response.json);
        for (const info of variantsOf(envelope.info)) {
          const parsed = schema.safeParse(info);
          expect(parsed.success ? null : `${probe.probe}: ${parsed.error.message}`).toBeNull();
        }
      }
    });
  }

  test('every activity item the backend recorded is read, none is dropped', () => {
    const pages = successesOf('GET /sync/activity');
    expect(pages.length).toBeGreaterThan(0);
    for (const probe of pages) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info) as { items: unknown[] };
      expect(info.items.length).toBeGreaterThan(0);
      expect(readActivityPage(info)?.rows).toHaveLength(info.items.length);
    }
  });

  test('the privacy answers carry the applicable signals the app reads', () => {
    for (const [route, schema] of [
      ['GET /privacy/me', privacyMeSchema],
      ['GET /privacy/users', privacyDirectorySchema],
    ] as const) {
      const answers = successesOf(route);
      expect(answers.length).toBeGreaterThan(0);
      for (const probe of answers) {
        const info = unmask(envelopeSchema.parse(probe.response.json).info);
        const read = schema.parse(info);
        expect(read.applicable).toEqual({ presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true, location: true });
      }
    }
  });

  test('every list of an impact the backend recorded is read whole, none is dropped', () => {
    const impacts = successesOf('GET /modules/{1}/impact');
    expect(impacts.length).toBeGreaterThanOrEqual(4);
    for (const probe of impacts) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info) as Record<string, unknown[]>;
      const read = moduleImpactSchema.parse(info);
      for (const list of ['stops', 'roleHolders', 'invitations', 'keepsRunning', 'roleMoves', 'reassignRoles'] as const) {
        expect(read[list]).toHaveLength(info[list]?.length ?? -1);
      }
    }
    const withHolder = impacts.filter(
      (probe) => (probe.response.json as { info: { roleHolders: unknown[] } }).info.roleHolders.length > 0
    );
    expect(withHolder.length).toBeGreaterThan(0);
  });

  test('the uninstall answer with a reassignment is the job and carries the moves the card and the dialog read', () => {
    const answers = successesOf('POST /modules/{1}/uninstall');
    expect(answers.length).toBeGreaterThan(0);
    for (const probe of answers) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info) as { roleMoves?: unknown[] };
      expect(info.roleMoves?.length).toBeGreaterThan(0);
      const read = moduleActionResultSchema.parse(info);
      expect('roleMoves' in read ? read.roleMoves : null).toHaveLength(info.roleMoves?.length ?? -1);
    }
  });

  test('the refusal of an uninstall while people hold the role is recorded as a list the app reads by its first entry', () => {
    const held = recorded.filter((probe) => probe.method === 'POST' && probe.route === '/modules/{1}/uninstall' && probe.response.status === 409);
    expect(held.length).toBeGreaterThan(0);
    for (const probe of held) {
      const envelope = envelopeSchema.parse(probe.response.json);
      expect(Array.isArray(envelope.errors)).toBe(true);
      const read = readEnvelope(409, JSON.stringify(probe.response.json));
      expect(read.errors?.code).toBe('MODULE_ROLES_HELD');
      expect(read.errors?.list?.some((entry) => entry.code === 'ROLE_HOLDER' && /^\d+:[a-z]+$/.test(entry.message))).toBe(true);
    }
  });

  test('the module list the backend recorded still reads with the new job fields absent', () => {
    for (const probe of successesOf('GET /modules')) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info);
      expect(readModuleList(info)?.length).toBeGreaterThan(0);
    }
  });

  test('the reminder rows the backend recorded carry every field the sync mapper reads', () => {
    const rows = [...successesOf('POST /reminder'), ...successesOf('PATCH /reminder/{1}')];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const probe of rows) {
      const info = unmask(envelopeSchema.parse(probe.response.json).info) as Record<string, unknown>;
      expect(Object.keys(TABLE_MAPS.reminder).filter((field) => !(field in info))).toEqual([]);
      const props = toModelProps('reminder', info);
      expect(props.targetUserId).toBe(String(info.targetUserId));
      expect(props.title).toBe(info.title);
    }
  });

  test('deleting an own reminder is recorded as a 204 without a body, which the envelope reader accepts', () => {
    const deleted = probes.filter(
      (probe) => probe.method === 'DELETE' && probe.route === '/reminder/{1}' && probe.response.status === 204
    );
    expect(deleted.length).toBeGreaterThan(0);
    expect(deleted.every((probe) => probe.response.json === null)).toBe(true);
    expect(readEnvelope(204, '')).toEqual({ status: 204, ok: true, info: null, errors: null });
  });
});
