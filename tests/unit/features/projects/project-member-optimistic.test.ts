import { describe, expect, test } from 'bun:test';
import type { IPeopleDirectoryCacheRow, IProjectMemberCacheRow } from '@/core/interfaces';
import { projectMemberLens } from '@/features/projects/model/project-member-optimistic';
import { personFullName } from '@/shared/libs/sharing';

const person = (id: string, name: string, lastName: string): IPeopleDirectoryCacheRow => ({
  id,
  name,
  lastName,
  role: 'resident',
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
});

const member: IProjectMemberCacheRow = { id: 'm1', projectId: '900', userId: '2', name: 'Luis Paz', access: 'view' };

describe('project member lens', () => {
  const lens = projectMemberLens('900', [person('2', 'Luis', 'Paz')]);

  test('an update changes only the access of its own row', () => {
    expect(lens.recordIdOf(member)).toBe('m1');
    expect(lens.patch(member, { access: 'edit' })).toEqual({ ...member, access: 'edit' });
    expect(lens.patch(member, {})).toEqual(member);
  });

  test('a create names the person from the directory and only for its own project', () => {
    expect(lens.create?.('pending-1', { projectId: 900, userId: 2, access: 'edit' })).toEqual({
      id: 'pending-1',
      projectId: '900',
      userId: '2',
      name: 'Luis Paz',
      access: 'edit',
    });
    expect(lens.create?.('pending-2', { projectId: 901, userId: 2, access: 'view' })).toBeNull();
    expect(lens.create?.('pending-3', { projectId: 900 })).toBeNull();
  });

  test('a create for a person the directory does not hold keeps an empty name', () => {
    const unnamed = projectMemberLens('900', []);
    expect(unnamed.create?.('pending-4', { projectId: 900, userId: 7, access: 'view' })).toEqual({
      id: 'pending-4',
      projectId: '900',
      userId: '7',
      name: '',
      access: 'view',
    });
  });
});

describe('person full name', () => {
  test('joins the given name and the last name, and skips an empty last name', () => {
    expect(personFullName({ name: 'Luis', lastName: 'Paz' })).toBe('Luis Paz');
    expect(personFullName({ name: 'Luis', lastName: '' })).toBe('Luis');
  });
});
