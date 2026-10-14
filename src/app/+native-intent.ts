import type { NativeIntent } from 'expo-router';

const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/$/,
  /^\/(agenda|projects|cameras|people|users|profile|security|settings|call|notification)$/,
  /^\/settings\/(modules|activity)$/,
  /^\/cameras\/\d+$/,
];

const CALL_PATH = '/call';
const CALL_ID = /[?&]callId=((?:rtc-[0-9a-f]{32})|(?:call-\d+))(?:[&#]|$)/;
const NOTIFICATION_PATH = '/notification';
const NOTIFICATION_ID = /[?&]notificationId=(\d{1,19})(?:[&#]|$)/;

export function deepLinkPath(link: string): string {
  const path = link
    .replace(/^argus:\/\//i, '/')
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    .split(/[?#]/)[0]
    ?.replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');
  if (!path || !ALLOWED_PATHS.some((pattern) => pattern.test(path))) return '/';
  if (path === CALL_PATH) {
    const callId = CALL_ID.exec(link)?.[1];
    return callId ? `${CALL_PATH}?callId=${callId}` : path;
  }
  if (path === NOTIFICATION_PATH) {
    const notificationId = NOTIFICATION_ID.exec(link)?.[1];
    return notificationId ? `${NOTIFICATION_PATH}?notificationId=${notificationId}` : '/';
  }
  return path;
}

export const redirectSystemPath: NativeIntent['redirectSystemPath'] = ({ path }) =>
  deepLinkPath(path);
