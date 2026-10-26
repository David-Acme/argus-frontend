import { describe, expect, test } from 'bun:test';
import { profileLinks, profileTabs } from '@/features/profile/model/profile-links';
import { viewFor } from '@tests/support/access-fixtures';

const everything = { modules: ['surveillance', 'productivity'] };
const coreOnly = { modules: [] };

const hrefsOf = (view: Parameters<typeof profileLinks>[0]) => {
  const links = profileLinks(view);
  return {
    home: links.home.map((link) => link.href),
    account: links.account.map((link) => link.href),
    argus: links.argus.map((link) => link.href),
  };
};

describe('profileLinks', () => {
  test('the owner manages the house and reaches every part of Argus', () => {
    expect(hrefsOf(viewFor('owner', everything))).toEqual({
      home: ['/users', '/users/visitors', '/settings/modules'],
      account: [
        '/profile/sessions',
        '/profile/privacy',
        '/profile/calls',
        '/profile/safety',
        '/profile/proximity',
      ],
      argus: ['/settings', '/settings/activity', '/profile/appearance', '/profile/language'],
    });
  });

  test('a guard reads the directory and asks for modules, with no Ajustes of Argus', () => {
    const links = hrefsOf(viewFor('guard', everything));
    expect(links.home).toEqual(['/people', '/profile/modules']);
    expect(links.argus).toEqual(['/profile/appearance', '/profile/language']);
  });

  test('a resident sees no directory, and safety and proximity leave with Seguridad', () => {
    const links = hrefsOf(viewFor('resident', coreOnly));
    expect(links.home).toEqual(['/profile/modules']);
    expect(links.account).toEqual(['/profile/sessions', '/profile/privacy', '/profile/calls']);
  });

  test('an inactive role keeps only its account and how the app looks', () => {
    const links = hrefsOf(viewFor('guard', coreOnly));
    expect(links.home).toEqual([]);
    expect(links.account).toEqual(['/profile/sessions', '/profile/privacy']);
    expect(links.argus).toEqual(['/profile/appearance', '/profile/language']);
  });
});

describe('profileTabs', () => {
  test('a tab without rows is dropped unless Casa has its own cards', () => {
    const links = profileLinks(viewFor('guard', coreOnly));
    expect(profileTabs(links, false)).toEqual(['account', 'argus']);
    expect(profileTabs(links, true)).toEqual(['home', 'account', 'argus']);
  });
});
