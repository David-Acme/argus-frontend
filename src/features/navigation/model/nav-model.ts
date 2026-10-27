import type { TranslationKey } from '@/core/types';
import type {
  ActiveModule,
  DestinationSurface,
  Placed,
  ResolvedSurfaces,
} from '@/shared/libs/surfaces';
import type { IconGlyph } from '@/shared/ui/icon';

export type NavPins = { bar: readonly string[]; quick: readonly string[] };

export type NavEntry = {
  key: string;
  href: string;
  icon: IconGlyph;
  label: TranslationKey;
  argus?: boolean;
  children?: readonly NavEntry[];
};

export type NavGroups = {
  core: readonly NavEntry[];
  modules: readonly NavEntry[];
  account: readonly NavEntry[];
};

export const ALL_KEY = 'all';

export const MENU_KEY = 'menu';

export const BAR_PINS = 2;

export const RAIL_PINS = 3;

export const SHEET_GRID = 8;

const MODULE_PREFIX = 'module:';

const CORE_TOP = ['home', 'argus', 'news'] as const;

const ACCOUNT = ['you', 'settings'] as const;

export const NO_PINS: NavPins = { bar: [], quick: [] };

export const moduleKey = (module: string): string => `${MODULE_PREFIX}${module}`;

export const ALL_ENTRY: NavEntry = {
  key: ALL_KEY,
  href: '',
  icon: 'grid',
  label: 'screens.navigation.all',
};

export const MENU_ENTRY: NavEntry = {
  key: MENU_KEY,
  href: '',
  icon: 'more',
  label: 'screens.navigation.menu',
};

const pathOf = (pathname: string): string => pathname.split(/[?#]/)[0] ?? pathname;

const entryOf = (destination: DestinationSurface): NavEntry => ({
  key: destination.id,
  href: destination.href,
  icon: destination.icon,
  label: destination.label,
  argus: destination.argus,
});

export const moduleEntry = (module: ActiveModule): NavEntry => ({
  key: moduleKey(module.module),
  href: module.href,
  icon: module.icon,
  label: module.label,
  children: module.destinations.map(entryOf),
});

function preferred(modules: readonly ActiveModule[], saved: readonly string[]): ActiveModule[] {
  const byId = new Map(modules.map((module) => [module.module, module]));
  const chosen = saved.flatMap((id) => {
    const module = byId.get(id);
    return module ? [module] : [];
  });
  return [...chosen, ...modules.filter((module) => !chosen.includes(module))];
}

export function pinnedModules(
  modules: readonly ActiveModule[],
  saved: readonly string[],
  count: number
): ActiveModule[] {
  return preferred(modules, saved).slice(0, count);
}

export function quickModules(modules: readonly ActiveModule[], pins: NavPins): ActiveModule[] {
  return pins.quick.length === 0 ? [...modules] : preferred(modules, pins.quick);
}

function core(resolved: ResolvedSurfaces, id: string): NavEntry | null {
  const found = resolved.destinations.find(
    (destination) => destination.module === 'core' && destination.id === id
  );
  return found ? entryOf(found) : null;
}

const present = (entries: readonly (NavEntry | null | undefined)[]): NavEntry[] =>
  entries.filter((entry): entry is NavEntry => entry != null);

export function barEntries(resolved: ResolvedSurfaces, pins: NavPins): NavEntry[] {
  const [first, second] = pinnedModules(resolved.modules, pins.bar, BAR_PINS).map(moduleEntry);
  return present([core(resolved, 'home'), first, core(resolved, 'argus'), second, ALL_ENTRY]);
}

export function railEntries(resolved: ResolvedSurfaces, pins: NavPins): NavEntry[] {
  const pinned = pinnedModules(resolved.modules, pins.bar, RAIL_PINS).map(moduleEntry);
  return present([
    MENU_ENTRY,
    core(resolved, 'home'),
    core(resolved, 'argus'),
    ...pinned,
    ALL_ENTRY,
  ]);
}

export function railFoot(resolved: ResolvedSurfaces): NavEntry[] {
  return present([core(resolved, 'you')]);
}

export function navGroups(resolved: ResolvedSurfaces, pins: NavPins): NavGroups {
  return {
    core: present(CORE_TOP.map((id) => core(resolved, id))),
    modules: preferred(resolved.modules, pins.bar).map(moduleEntry),
    account: present(ACCOUNT.map((id) => core(resolved, id))),
  };
}

function owner(
  destinations: readonly Placed<DestinationSurface>[],
  segment: string
): Placed<DestinationSurface> | undefined {
  return destinations.find((destination) => destination.segments?.includes(segment));
}

export function activeKey(pathname: string, resolved: ResolvedSurfaces): string {
  const path = pathOf(pathname);
  if (path === '/' || path === '') return 'home';
  const segment = path.split('/')[1] ?? '';
  const found = owner(resolved.destinations, segment);
  if (!found) return 'home';
  return found.module === 'core' ? found.id : moduleKey(found.module);
}

export function activeChild(pathname: string, resolved: ResolvedSurfaces): string | null {
  const segment = pathOf(pathname).split('/')[1] ?? '';
  return owner(resolved.destinations, segment)?.id ?? null;
}

export function barKey(active: string, entries: readonly NavEntry[]): string {
  return entries.some((entry) => entry.key === active) ? active : ALL_KEY;
}

export function togglePin(saved: readonly string[], module: string, count: number): string[] {
  if (saved.includes(module)) return saved.filter((id) => id !== module);
  return [module, ...saved].slice(0, count);
}
