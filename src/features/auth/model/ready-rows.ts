import type { InfoRow } from '@/features/auth/model/info-row';

export type ReadyInput = { modules: readonly string[]; alerts: boolean };

const FACE: InfoRow = {
  key: 'face',
  icon: 'face',
  title: 'screens.welcome.ready.face.title',
  meta: 'screens.welcome.ready.face.meta',
  done: true,
};

const SECURITY: InfoRow = {
  key: 'security',
  icon: 'shield',
  title: 'screens.welcome.ready.security.title',
  meta: 'screens.welcome.ready.security.meta',
  done: true,
};

const PRODUCTIVITY: InfoRow = {
  key: 'productivity',
  icon: 'cal',
  title: 'screens.welcome.ready.productivity.title',
  meta: 'screens.welcome.ready.productivity.meta',
  done: true,
};

const ALERTS: InfoRow = {
  key: 'alerts',
  icon: 'bell',
  title: 'screens.welcome.ready.alerts.title',
  meta: 'screens.welcome.ready.alerts.meta',
  done: true,
};

export function readyRowsOf({ modules, alerts }: ReadyInput): InfoRow[] {
  return [
    FACE,
    ...(modules.includes('surveillance') ? [SECURITY] : []),
    ...(modules.includes('productivity') ? [PRODUCTIVITY] : []),
    ...(alerts ? [ALERTS] : []),
  ];
}
