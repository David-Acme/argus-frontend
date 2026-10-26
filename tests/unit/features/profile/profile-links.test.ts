import { describe, expect, test } from 'bun:test';
import { profileLinks } from '@/features/profile/model/profile-links';
import { viewFor } from '@tests/support/access-fixtures';

const hrefs = (role: Parameters<typeof viewFor>[0]) =>
  profileLinks(viewFor(role)).map((link) => link.href);

describe('profileLinks', () => {
  test('Tú leads each role to the people and settings it may open', () => {
    expect(hrefs('owner')).toEqual(['/users', '/settings']);
    expect(hrefs('guard')).toEqual(['/people']);
    expect(hrefs('resident')).toEqual([]);
    expect(hrefs('guest')).toEqual([]);
  });
});
