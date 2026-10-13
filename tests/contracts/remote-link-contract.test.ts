import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendRoot } from '@tests/support/backend-dir';
import { readContext } from '@/core/contracts/context.contract';

interface ProfileVector {
  homeId: string;
  domain: string;
}

interface RelayVectors {
  homeId: string;
  domain: string;
  usableProfiles: ProfileVector[];
  unusableProfiles: ProfileVector[];
}

const header = readFileSync(join(backendRoot(), 'packages/contracts/routes/src/routes/remote-link.hxx'), 'utf8');
const vectors = JSON.parse(readFileSync(join(import.meta.dir, '../vectors/relay-hosts.json'), 'utf8')) as RelayVectors;

const context = { userId: 7, role: 'resident', modules: [] };
const remote = { homeId: vectors.homeId, domain: vectors.domain, since: 1760371200 };

const limit = (name: string): number => Number(header.match(new RegExp(`${name} = (\\d+)`))?.[1]);
const longestLabel = (domain: string): number => Math.max(...domain.split('.').map((label) => label.length));

describe('the remote link in the context matches the backend', () => {
  test('every link the backend writes is read, and nothing else is', () => {
    const writer = header.slice(header.indexOf('remoteLinkToString'), header.indexOf('remoteLinkFromString'));
    const links = [...new Set([...writer.matchAll(/return "([a-z]+)";/g)].map(([, link = '']) => link))];
    expect(links.sort()).toEqual(['connecting', 'down', 'up']);
    for (const link of links) {
      const read: string | undefined = readContext({ ...context, remote: { ...remote, link } })?.remote?.link;
      expect(read).toBe(link);
    }
    expect(readContext({ ...context, remote: { ...remote, link: 'sideways' } })?.remote).toBeNull();
  });

  test('the fields are the ones the backend names', () => {
    const fields = Object.fromEntries(
      [...header.matchAll(/kRemote(\w+)Field = "(\w+)"/g)].map(([, name = '', field = '']) => [name, field])
    );
    expect(fields).toEqual({ HomeId: 'homeId', Domain: 'domain', Link: 'link', Since: 'since' });
  });

  test('the vector file runs to the backend limits and one past them', () => {
    expect(vectors.homeId.length).toBe(limit('kHomeIdLength'));
    const usable = vectors.usableProfiles.map((profile) => profile.domain);
    const unusable = vectors.unusableProfiles.map((profile) => profile.domain);
    expect(Math.max(...usable.map((domain) => domain.length))).toBe(limit('kMaxDomainLength'));
    expect(unusable.some((domain) => domain.length === limit('kMaxDomainLength') + 1)).toBe(true);
    expect(Math.max(...usable.map(longestLabel))).toBe(limit('kMaxLabelLength'));
    expect(unusable.some((domain) => longestLabel(domain) === limit('kMaxLabelLength') + 1)).toBe(true);
  });
});
