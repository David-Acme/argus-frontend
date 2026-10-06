import type { ActivityItem, IconName, TranslateFn, TranslationKey } from '@/core/types';

const THINGS: Readonly<Record<string, { key: TranslationKey; icon: IconName }>> = {
  camera: { key: 'screens.activity.thing.camera', icon: 'video' },
  camera_stream: { key: 'screens.activity.thing.camera_stream', icon: 'video' },
  zone: { key: 'screens.activity.thing.zone', icon: 'scan-face' },
  reminder: { key: 'screens.activity.thing.reminder', icon: 'bell' },
  reminder_detail: { key: 'screens.activity.thing.reminder_detail', icon: 'bell' },
  calendar_event: { key: 'screens.activity.thing.calendar_event', icon: 'calendar' },
  calendar_event_share: { key: 'screens.activity.thing.calendar_event_share', icon: 'calendar' },
  project: { key: 'screens.activity.thing.project', icon: 'list-todo' },
  project_member: { key: 'screens.activity.thing.project_member', icon: 'users' },
  project_task: { key: 'screens.activity.thing.project_task', icon: 'list-todo' },
  event: { key: 'screens.activity.thing.event', icon: 'shield' },
  person: { key: 'screens.activity.thing.person', icon: 'user' },
  notification: { key: 'screens.activity.thing.notification', icon: 'bell' },
  user: { key: 'screens.activity.thing.user', icon: 'user' },
  user_invitation: { key: 'screens.activity.thing.user_invitation', icon: 'qr-code' },
};

type ModuleEventName =
  | 'enabled'
  | 'disabled'
  | 'installed'
  | 'uninstalled'
  | 'purged'
  | 'paused'
  | 'resumed'
  | 'cancelled'
  | 'failed';

const MODULE_EVENTS: Readonly<Record<string, ModuleEventName>> = {
  enabled: 'enabled',
  enable: 'enabled',
  disabled: 'disabled',
  disable: 'disabled',
  installed: 'installed',
  install: 'installed',
  uninstalled: 'uninstalled',
  uninstall: 'uninstalled',
  purged: 'purged',
  purge: 'purged',
  paused: 'paused',
  pause: 'paused',
  resumed: 'resumed',
  resume: 'resumed',
  cancelled: 'cancelled',
  cancel: 'cancelled',
  failed: 'failed',
  fail: 'failed',
};

export type ActivityContext = {
  names: ReadonlyMap<number, string>;
  moduleName: (moduleId: string) => string;
  t: TranslateFn;
};

export type ActivityLine = {
  icon: IconName;
  title: string;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'string') {
    try {
      return asObject(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

export function moduleEventOf(item: Pick<ActivityItem, 'newData' | 'oldData'>): string | null {
  const event = asObject(item.newData)?.event ?? asObject(item.oldData)?.event;
  return typeof event === 'string' ? event.trim().toLowerCase() : null;
}

export const whoOf = (item: Pick<ActivityItem, 'userId'>, names: ReadonlyMap<number, string>, t: TranslateFn): string =>
  names.get(item.userId) ?? t('screens.users.unknown-user', { id: String(item.userId) });

export function describeActivity(item: ActivityItem, context: ActivityContext): ActivityLine {
  const { t } = context;
  const who = whoOf(item, context.names, t);
  if (item.table === 'module') {
    const event = moduleEventOf(item);
    const name = (event && MODULE_EVENTS[event]) || 'changed';
    return { icon: 'blocks', title: t(`screens.activity.module.${name}`, { who, module: context.moduleName(item.module) }) };
  }
  const thing = THINGS[item.table];
  const text = thing ? t(thing.key) : t('screens.activity.thing.other', { table: item.table || '?' });
  const verb = item.action === 'create' || item.action === 'delete' || item.action === 'read' ? item.action : 'update';
  return { icon: thing?.icon ?? 'history', title: t(`screens.activity.sentence.${verb}`, { who, thing: text }) };
}
