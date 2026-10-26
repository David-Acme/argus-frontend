import type { SessionPlatform } from '@/core/types';

export type FactKey = 'people' | 'cameras' | 'devices';

export type FactHref = '/users' | '/people' | '/security' | '/profile/sessions';

export type ProfileFact = { key: FactKey; value: number; href: FactHref };

export type FactInput = {
  people: { count: number; href: '/users' | '/people' } | null;
  cameras: number | null;
  devices: number | null;
};

export type DeviceKind = 'phone' | 'computer' | 'browser';

const DEVICE: Readonly<Record<SessionPlatform, DeviceKind | null>> = {
  android: 'phone',
  ios: 'phone',
  desktop: 'computer',
  web: 'browser',
  unknown: null,
};

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  return letters.map((word) => (word ?? '').charAt(0).toLocaleUpperCase()).join('');
}

export function factsOf({ people, cameras, devices }: FactInput): ProfileFact[] {
  const facts: ProfileFact[] = [];
  if (people) facts.push({ key: 'people', value: people.count, href: people.href });
  if (cameras !== null) facts.push({ key: 'cameras', value: cameras, href: '/security' });
  if (devices !== null) facts.push({ key: 'devices', value: devices, href: '/profile/sessions' });
  return facts;
}

export const deviceKindOf = (platform: SessionPlatform | null): DeviceKind | null =>
  platform ? DEVICE[platform] : null;
