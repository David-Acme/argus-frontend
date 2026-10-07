import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NOTIFICATION_KIND_MODULES,
  moduleOfNotification,
  notificationVisible,
} from '@/features/home/model/notification-modules';
import { MODULE_IDS } from '@/shared/constants';

const headerPath = join(
  import.meta.dir,
  '../../../backend/services/notification/src/shared/vocabulary/notification-kind.hxx'
);
const header = existsSync(headerPath) ? readFileSync(headerPath, 'utf8') : '';

function moduleConstants(): Map<string, string> {
  return new Map(
    [...header.matchAll(/inline constexpr std::string_view (k\w+) = "([a-z]+)";/g)].map(
      ([, name = '', id = '']) => [name, id] as const
    )
  );
}

function backendKinds(): Map<string, string> {
  const constants = moduleConstants();
  return new Map(
    [...header.matchAll(/\{\.kind = "([a-z_]+)", \.module = (k\w+)\}/g)].map(
      ([, kind = '', constant = '']) => [kind, constants.get(constant) ?? `unresolved ${constant}`] as const
    )
  );
}

const row = (kind?: string, type = 'system') => ({ type, data: kind === undefined ? {} : { kind } });
const offOnly = (moduleId: string) => (id: string) => id !== moduleId;

describe('notification kinds against the backend vocabulary', () => {
  const kinds = backendKinds();

  test('the backend header is readable and declares its kinds', () => {
    expect(header.length).toBeGreaterThan(0);
    expect(kinds.size).toBeGreaterThan(0);
    const declared = Number(/std::array<KindModule, (\d+)>/.exec(header)?.[1] ?? 0);
    expect(declared).toBe(kinds.size);
  });

  test('the app map equals kModuleKinds entry for entry', () => {
    expect([...NOTIFICATION_KIND_MODULES].sort()).toEqual([...kinds].sort());
  });

  test('every module the backend names is a module the app knows', () => {
    const known = new Set<string>(Object.values(MODULE_IDS));
    expect([...kinds.values()].every((id) => known.has(id))).toBe(true);
  });

  test('a kind the backend does not list is core, agenda_reminder and guard_duress included', () => {
    for (const kind of [
      'agenda_reminder',
      'guard_duress',
      'guard_panic',
      'guard_response',
      'assistant_reminder',
      'assistant_task',
      'module_request',
    ]) {
      expect(kinds.has(kind)).toBe(false);
      expect(moduleOfNotification(row(kind))).toBe(MODULE_IDS.core);
    }
    expect(moduleOfNotification(row('constructor'))).toBe(MODULE_IDS.core);
  });

  test('a row without a kind is core whatever its type', () => {
    expect(moduleOfNotification(row(undefined, 'camera'))).toBe(MODULE_IDS.core);
    expect(moduleOfNotification({ data: { kind: 7 } })).toBe(MODULE_IDS.core);
  });

  test('each listed kind resolves to the module the backend gives it', () => {
    for (const [kind, moduleId] of kinds) expect(moduleOfNotification(row(kind, 'camera'))).toBe(moduleId);
  });
});

describe('the notification feed hides only the kinds of an inactive module', () => {
  const kinds = backendKinds();

  test('with a module off, exactly the kinds the backend assigns to it disappear', () => {
    for (const moduleId of [MODULE_IDS.surveillance, MODULE_IDS.productivity]) {
      const hidden = [...kinds.keys()].filter((kind) => !notificationVisible(row(kind), offOnly(moduleId)));
      expect(hidden.sort()).toEqual([...kinds].filter(([, owner]) => owner === moduleId).map(([kind]) => kind).sort());
    }
  });

  test('reminders and duress stay visible with surveillance and productivity both off', () => {
    const coreOnly = (id: string) => id === MODULE_IDS.core;
    for (const kind of [
      'agenda_reminder',
      'assistant_reminder',
      'assistant_task',
      'guard_duress',
      'guard_panic',
      'module_request',
      'call',
    ]) {
      expect(notificationVisible(row(kind), coreOnly)).toBe(true);
    }
    expect(notificationVisible(row(undefined, 'camera'), coreOnly)).toBe(true);
    expect(notificationVisible(row(undefined, 'system'), coreOnly)).toBe(true);
  });

  test('a surveillance kind is hidden by surveillance only and an agenda event by productivity only', () => {
    expect(notificationVisible(row('guard_episode'), offOnly(MODULE_IDS.surveillance))).toBe(false);
    expect(notificationVisible(row('guard_episode'), offOnly(MODULE_IDS.productivity))).toBe(true);
    expect(notificationVisible(row('agenda_event'), offOnly(MODULE_IDS.productivity))).toBe(false);
    expect(notificationVisible(row('agenda_event'), offOnly(MODULE_IDS.surveillance))).toBe(true);
  });

  test('with every module active nothing is hidden', () => {
    for (const kind of [...kinds.keys(), 'agenda_reminder', 'guard_duress']) {
      expect(notificationVisible(row(kind), () => true)).toBe(true);
    }
  });
});
