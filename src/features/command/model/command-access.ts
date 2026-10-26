import type { Href } from 'expo-router';
import type { TableName } from '@/core/types';
import { ASSISTANT_THREAD_HREF, CAPABILITY, NEW_ITEM_PARAM } from '@/shared/constants';
import {
  hasCapability,
  peopleAccessOf,
  tableAllowed,
  type AccessView,
} from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import type { SearchEntry, SearchKind } from './command-search';

export type CreateKind = 'reminder' | 'event' | 'task' | 'project';

export type SectionKey = 'home' | 'security' | 'argus' | 'agenda' | 'you';

type Path = Extract<Href, string>;

export type SectionJump = { key: SectionKey; href: Path; shortcut: string };

export type CommandAccess = {
  search: ReadonlySet<SearchKind>;
  create: readonly CreateKind[];
  sections: readonly SectionJump[];
  asks: boolean;
  agenda: boolean;
  people: '/users' | '/people' | null;
};

const SECTIONS: readonly { key: SectionKey; href: Path }[] = [
  { key: 'home', href: '/' },
  { key: 'security', href: '/security' },
  { key: 'argus', href: ASSISTANT_THREAD_HREF },
  { key: 'agenda', href: '/agenda' },
  { key: 'you', href: '/profile' },
];

const PEOPLE_ROUTES = ['/users', '/people'] as const satisfies readonly Path[];

const allowedOf = <T>(pairs: readonly (readonly [T, boolean])[]): T[] =>
  pairs.filter(([, allowed]) => allowed).map(([value]) => value);

export function commandAccess(view: AccessView, hasProjects: boolean): CommandAccess {
  const opens = (href: string) => routeFallback(href, view) === null;
  const reads = (table: TableName) => tableAllowed(view, table, 'read');
  const creates = (table: TableName) => tableAllowed(view, table, 'create');
  const agenda = opens('/agenda');
  const projects = opens('/projects');
  const asks = opens(ASSISTANT_THREAD_HREF);
  const people = PEOPLE_ROUTES.find(opens) ?? null;
  const search = allowedOf<SearchKind>([
    ['reminder', hasCapability(view, CAPABILITY.remindersRead)],
    ['event', agenda && reads('calendar_event')],
    ['task', projects && reads('project_task')],
    ['project', projects && reads('project')],
    ['person', people !== null && peopleAccessOf(view).receivesDirectory],
    ['camera', opens('/cameras') && reads('camera')],
  ]);
  return {
    search: new Set(search),
    create: allowedOf<CreateKind>([
      ['reminder', asks && hasCapability(view, CAPABILITY.remindersWrite)],
      ['event', agenda && creates('calendar_event')],
      ['task', projects && hasProjects && creates('project_task')],
      ['project', projects && creates('project')],
    ]),
    sections: SECTIONS.filter(({ href }) => opens(href)).map((section, at) => ({
      ...section,
      shortcut: String(at + 1),
    })),
    asks,
    agenda,
    people,
  };
}

export function entryHref(
  entry: SearchEntry,
  access: Pick<CommandAccess, 'agenda' | 'people'>
): Href {
  const day = { at: String(entry.at ?? '') };
  switch (entry.kind) {
    case 'reminder':
      return access.agenda && entry.at !== null ? { pathname: '/agenda', params: day } : '/';
    case 'event':
      return { pathname: '/agenda', params: day };
    case 'task':
      return { pathname: '/projects', params: { id: entry.parentId ?? '', task: entry.id } };
    case 'project':
      return { pathname: '/projects', params: { id: entry.id } };
    case 'person':
      return access.people ?? '/';
    case 'camera':
      return { pathname: '/cameras/[id]', params: { id: entry.id } };
  }
}

export function createHref(kind: Exclude<CreateKind, 'reminder'>): Href {
  return kind === 'event'
    ? { pathname: '/agenda', params: { new: NEW_ITEM_PARAM.event } }
    : { pathname: '/projects', params: { new: NEW_ITEM_PARAM[kind] } };
}
