import { describe, expect, test } from 'bun:test';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import {
  memberCandidates,
  ownsProject,
  projectAccessOf,
  worksOnProject,
} from '@/features/projects/model/project-access';

const person = (id: string, role: IPeopleDirectoryCacheRow['role'], isActive = true): IPeopleDirectoryCacheRow => ({
  id,
  name: `P${id}`,
  lastName: '',
  role,
  isActive,
  createdAt: 0,
  updatedAt: 0,
});

describe('project access', () => {
  const members = [
    { userId: '2', access: 'edit' },
    { userId: '3', access: 'view' },
  ];

  test('the owner owns, an edit member works, a view member only reads, anyone else has nothing', () => {
    expect(projectAccessOf({ ownerId: '1', userId: '1', members })).toBe('owner');
    expect(projectAccessOf({ ownerId: '1', userId: '2', members })).toBe('edit');
    expect(projectAccessOf({ ownerId: '1', userId: '3', members })).toBe('view');
    expect(projectAccessOf({ ownerId: '1', userId: '4', members })).toBe('none');
    expect(projectAccessOf({ ownerId: '1', userId: '', members })).toBe('none');
  });

  test('working on tasks needs owner or edit, managing members needs the owner', () => {
    expect([worksOnProject('owner'), worksOnProject('edit'), worksOnProject('view'), worksOnProject('none')]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect([ownsProject('owner'), ownsProject('edit'), ownsProject('view')]).toEqual([true, false, false]);
  });

  test('candidates are active people who can read projects and are not in it yet', () => {
    const people = [
      person('1', 'owner'),
      person('2', 'resident'),
      person('5', 'resident'),
      person('6', 'resident', false),
      person('7', 'guard'),
      person('8', 'guest'),
    ];
    expect(memberCandidates({ ownerId: '1', members: [{ userId: '2' }], people }).map((p) => p.id)).toEqual(['5']);
  });
});
