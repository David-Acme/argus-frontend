import { describe, expect, test } from 'bun:test';
import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import {
  invitationGroupsOf,
  invitationLinesOf,
  offerableRoles,
  pendingCount,
  previewLifecycle,
} from '@/features/people/model/invitations';
import {
  fullNameOf,
  personLinesOf,
  personRightsOf,
  selectedPerson,
} from '@/features/people/model/people';
import {
  personDraftChanged,
  personDraftOf,
  personUpdateOf,
} from '@/features/people/model/person-draft';

const NOW = new Date(2026, 9, 26, 12, 0);

const user = (
  id: string,
  name: string,
  patch: Partial<IPeopleDirectoryCacheRow> = {}
): IPeopleDirectoryCacheRow => ({
  id,
  name,
  lastName: '',
  role: 'resident',
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

const invitation = (id: number, patch: Partial<IInvitationRecord> = {}): IInvitationRecord => ({
  id,
  role: 'resident',
  maxRedemptions: 1,
  redemptionCount: 0,
  expiresAt: Math.floor(NOW.getTime() / 1000) + 600,
  createdBy: 1,
  revokedAt: null,
  createdAt: id,
  ...patch,
});

describe('the people of the home', () => {
  const rows = [
    user('3', 'Luis', { lastName: 'Paz' }),
    user('1', 'Ana', { role: 'owner' }),
    user('4', 'Beto', { isActive: false }),
    user('5', ' ', { lastName: '' }),
  ];

  test('active people first, me first among them, then by name; nameless rows leave', () => {
    const lines = personLinesOf({ rows, selfId: '3', overview: null, now: NOW });
    expect(lines.map((line) => line.id)).toEqual(['3', '1', '4']);
    expect(lines[0]).toMatchObject({ name: 'Luis Paz', initial: 'L', self: true, presence: null });
  });

  test('presence comes only for active people and only when the owner read it', () => {
    const overview = {
      people: [
        {
          userId: 3,
          state: 'home' as const,
          since: Math.floor(NOW.getTime() / 1000) - 60,
          environments: [],
        },
        { userId: 4, state: 'away' as const, since: 1, environments: [] },
      ],
    };
    const lines = personLinesOf({ rows, selfId: '1', overview, now: NOW });
    expect(lines.find((line) => line.id === '3')?.presence).toMatchObject({
      state: 'home',
      sinceKind: 'today',
    });
    expect(lines.find((line) => line.id === '4')?.presence).toBeNull();
    expect(lines.find((line) => line.id === '1')?.presence).toMatchObject({ state: 'unknown' });
  });

  test('a full name joins what is written', () => {
    expect(fullNameOf({ name: ' Ana ', lastName: 'Ruiz' })).toBe('Ana Ruiz');
    expect(fullNameOf({ name: 'Ana', lastName: '' })).toBe('Ana');
  });

  test('wide screens open the first person, a phone only the one asked for', () => {
    const lines = personLinesOf({ rows, selfId: '1', overview: null, now: NOW });
    expect(selectedPerson(lines, '', true)?.id).toBe('1');
    expect(selectedPerson(lines, '', false)).toBeNull();
    expect(selectedPerson(lines, '3', false)?.id).toBe('3');
    expect(selectedPerson(lines, '99', true)).toBeNull();
  });
});

describe('what each role may do with a person', () => {
  test('the owner manages others, never deactivates itself, and marks minors only below owner', () => {
    expect(
      personRightsOf({ action: 'manage', person: { self: false, role: 'resident' } })
    ).toMatchObject({
      edit: true,
      sessions: true,
      deactivate: true,
      minor: true,
      portrait: false,
    });
    expect(
      personRightsOf({ action: 'manage', person: { self: true, role: 'owner' } })
    ).toMatchObject({
      deactivate: false,
      minor: false,
    });
  });

  test('a guard reads the directory and may only verify a portrait', () => {
    expect(
      personRightsOf({ action: 'directory', person: { self: false, role: 'resident' } })
    ).toEqual({
      edit: false,
      sessions: false,
      privacy: false,
      minor: false,
      voice: false,
      biometrics: false,
      deactivate: false,
      portrait: true,
    });
  });

  test('anyone else gets nothing', () => {
    expect(
      Object.values(personRightsOf({ action: null, person: { self: true, role: 'guest' } }))
    ).not.toContain(true);
  });
});

describe('invitations', () => {
  const nowMs = NOW.getTime();

  test('pending first, then used, lapsed and closed, newest first inside each', () => {
    const lines = invitationLinesOf(
      [
        invitation(1, { redemptionCount: 1 }),
        invitation(2, { revokedAt: 5 }),
        invitation(3),
        invitation(4, { expiresAt: 1 }),
        invitation(5),
      ],
      nowMs
    );
    expect(lines.map((line) => [line.id, line.state])).toEqual([
      [5, 'waiting'],
      [3, 'waiting'],
      [1, 'used'],
      [4, 'lapsed'],
      [2, 'closed'],
    ]);
    expect(lines.filter((line) => line.revocable).map((line) => line.id)).toEqual([5, 3]);
    expect(pendingCount(lines)).toBe(2);
  });

  test('closed and lapsed invitations go to the earlier group, the rest stay in view', () => {
    const groups = invitationGroupsOf(
      invitationLinesOf(
        [
          invitation(1, { redemptionCount: 1 }),
          invitation(2, { revokedAt: 5 }),
          invitation(3),
          invitation(4, { expiresAt: 1 }),
        ],
        nowMs
      )
    );
    expect(groups.current.map((line) => line.id)).toEqual([3, 1]);
    expect(groups.earlier.map((line) => line.id)).toEqual([4, 2]);
  });

  test('an invitation closed by a module names the module', () => {
    const [line] = invitationLinesOf(
      [
        invitation(7, {
          revokedAt: 5,
          revokedReason: 'module_disabled',
          revokedModule: 'surveillance',
        }),
      ],
      nowMs
    );
    expect(line?.closing).toEqual({ reason: 'module', moduleId: 'surveillance' });
  });

  test('only the roles whose module is on can be invited', () => {
    expect(offerableRoles(() => false)).toEqual(['resident', 'guard', 'guest']);
    expect(offerableRoles((role) => role === 'guard')).toEqual(['resident', 'guest']);
  });

  test('a fresh preview waits until its record says otherwise', () => {
    expect(previewLifecycle({ expiresAt: 9 }, null)).toEqual({
      revokedAt: null,
      expiresAt: 9,
      redemptionCount: 0,
      maxRedemptions: 1,
    });
    const record = invitation(3, { redemptionCount: 1 });
    expect(previewLifecycle({ expiresAt: 9 }, record)).toBe(record);
  });
});

describe('editing a person', () => {
  const row = user('3', 'Luis', { lastName: 'Paz' });

  test('the draft starts from the row and knows when it changed', () => {
    const draft = personDraftOf(row);
    expect(personDraftChanged(row, draft)).toBe(false);
    expect(personDraftChanged(row, { ...draft, role: 'guard' })).toBe(true);
  });

  test('a name is required and every field is trimmed', () => {
    expect(personUpdateOf({ name: '  ', lastName: 'Paz', role: 'resident' })).toBeNull();
    expect(personUpdateOf({ name: ' Luis ', lastName: ' Paz ', role: 'guest' })).toEqual({
      name: 'Luis',
      lastName: 'Paz',
      role: 'guest',
    });
  });
});
