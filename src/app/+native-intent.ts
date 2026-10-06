import type { NativeIntent } from 'expo-router';

const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/$/,
  /^\/(agenda|projects|cameras|people|users|profile|security|settings|call)$/,
  /^\/settings\/(modules|activity)$/,
  /^\/cameras\/\d+$/,
];

const CALL_PATH = '/call';
const CALL_ID = /[?&]callId=((?:rtc-[0-9a-f]{32})|(?:call-\d+))(?:[&#]|$)/;

export function deepLinkPath(link: string): string {
  const path = link
    .replace(/^argus:\/\//i, '/')
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    .split(/[?#]/)[0]
    ?.replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');
  if (!path || !ALLOWED_PATHS.some((pattern) => pattern.test(path))) return '/';
  const callId = path === CALL_PATH ? CALL_ID.exec(link)?.[1] : undefined;
  return callId ? `${CALL_PATH}?callId=${callId}` : path;
}

export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path }) =>
  deepLinkPath(path);
