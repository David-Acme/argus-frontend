import type { NativeIntent } from 'expo-router';

const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/$/,
  /^\/(agenda|projects|cameras|people|users|profile|security|settings|call)$/,
  /^\/cameras\/\d+$/,
];

export function deepLinkPath(link: string): string {
  const path = link
    .replace(/^argus:\/\//i, '/')
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    .split(/[?#]/)[0]
    ?.replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');
  return path && ALLOWED_PATHS.some((pattern) => pattern.test(path)) ? path : '/';
}

export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path }) => deepLinkPath(path);
