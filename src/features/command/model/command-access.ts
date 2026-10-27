import type { Href } from 'expo-router';
import type { TranslationKey } from '@/core/types';
import { ASSISTANT_THREAD_HREF, NEW_ITEM_PARAM } from '@/shared/constants';
import type { AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import type { ResolvedSurfaces } from '@/shared/libs/surfaces';
import type { IconGlyph } from '@/shared/ui/icon';
import type { SearchEntry, SearchKind } from './command-search';

export type CreateKind = 'reminder' | 'event' | 'task' | 'project';

export type SectionJump = {
  key: string;
  href: string;
  icon: IconGlyph;
  label: TranslationKey;
  shortcut: string;
};

export type CommandAccess = {
  search: ReadonlySet<SearchKind>;
  create: readonly CreateKind[];
  sections: readonly SectionJump[];
  asks: boolean;
  people: '/users' | '/people' | null;
};

const PEOPLE_ROUTES = ['/users', '/people'] as const;

const SEARCH_KINDS: readonly SearchKind[] = ['event', 'task', 'project', 'person', 'camera'];

const CREATE_KINDS: readonly CreateKind[] = ['reminder', 'event', 'task', 'project'];

export function commandAccess(
  view: AccessView,
  hasProjects: boolean,
  surfaces: ResolvedSurfaces
): CommandAccess {
  const opens = (href: string) => routeFallback(href, view) === null;
  return {
    search: new Set(SEARCH_KINDS.filter((kind) => surfaces.search.has(kind))),
    create: CREATE_KINDS.filter(
      (kind) => surfaces.actions.has(kind) && (kind !== 'task' || hasProjects)
    ),
    sections: surfaces.destinations
      .flatMap((destination) =>
        destination.jump
          ? [
              {
                key: destination.id,
                href: destination.href,
                icon: destination.icon,
                label: destination.jump,
              },
            ]
          : []
      )
      .map((section, at) => ({ ...section, shortcut: String(at + 1) })),
    asks: opens(ASSISTANT_THREAD_HREF),
    people: PEOPLE_ROUTES.find(opens) ?? null,
  };
}

export function entryHref(entry: SearchEntry, access: Pick<CommandAccess, 'people'>): Href {
  const day = { at: String(entry.at ?? '') };
  switch (entry.kind) {
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
