export type TabMove = 'stay' | 'home' | 'push' | 'replace';

const BAR_HIDDEN: readonly RegExp[] = [
  /^\/cameras\/?$/,
  /^\/conversations\/[^/]+/,
  /^\/security\/[^/]+/,
  /^\/users\/visitors(\/|$)/,
  /^\/settings\/[^/]+/,
  /^\/profile\/[^/]+/,
  /^\/watch(\/|$)/,
  /^\/clips\/[^/]+/,
];

const pathOf = (pathname: string): string => pathname.split(/[?#]/)[0] ?? pathname;

export const barShownOn = (pathname: string): boolean =>
  !BAR_HIDDEN.some((pattern) => pattern.test(pathOf(pathname)));

export function tabMove(from: string, to: string): TabMove {
  const path = pathOf(from);
  if (path === to) return 'stay';
  if (to === '/') return 'home';
  return path === '/' ? 'push' : 'replace';
}
