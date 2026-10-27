import type { ComponentType } from 'react';
import type { TranslationKey } from '@/core/types';
import { MODULE_IDS, type Capability } from '@/shared/constants';
import { hasCapability, isModuleActive, type AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import type { IconGlyph } from '@/shared/ui/icon';

export type SurfaceNeeds = {
  capabilities?: readonly Capability[];
  anyOf?: readonly Capability[];
  route?: string;
  allows?: (view: AccessView) => boolean;
};

export type SurfaceContribution = { id: string; needs?: SurfaceNeeds };

export type InicioColumnId = 'agenda' | 'news' | 'cameras' | 'side';

export type InicioForm = 'stack' | 'first' | 'band' | 'wide';

export type InicioPlace = {
  order: number;
  column?: InicioColumnId;
  when?: string;
  grows?: boolean;
};

export type InicioSurface = SurfaceContribution & {
  render: ComponentType;
  places: Partial<Record<InicioForm, InicioPlace>>;
};

export type DestinationSurface = SurfaceContribution & {
  href: string;
  icon: IconGlyph;
  label: TranslationKey;
  order: number;
  jump?: TranslationKey;
  argus?: boolean;
  segments?: readonly string[];
};

export type ModuleHub = {
  label: TranslationKey;
  icon: IconGlyph;
  href: string;
  needs?: SurfaceNeeds;
};

export type ModuleSurfaces = {
  module: string;
  order: number;
  hub?: ModuleHub;
  inicio?: readonly InicioSurface[];
  destinations?: readonly DestinationSurface[];
  search?: readonly SurfaceContribution[];
  actions?: readonly SurfaceContribution[];
};

export type Placed<T> = T & { module: string };

export type ActiveModule = ModuleHub & {
  module: string;
  order: number;
  destinations: readonly Placed<DestinationSurface>[];
};

export type ResolvedSurfaces = {
  modules: readonly ActiveModule[];
  inicio: readonly Placed<InicioSurface>[];
  destinations: readonly Placed<DestinationSurface>[];
  search: ReadonlySet<string>;
  actions: ReadonlySet<string>;
};

type Kind = 'inicio' | 'destinations' | 'search' | 'actions';

const KINDS: readonly Kind[] = ['inicio', 'destinations', 'search', 'actions'];

const FORMS: readonly InicioForm[] = ['stack', 'first', 'band', 'wide'];

export function surfaceAllowed(
  module: string,
  needs: SurfaceNeeds | undefined,
  view: AccessView
): boolean {
  if (module !== MODULE_IDS.core && !isModuleActive(view, module)) return false;
  if (!needs) return true;
  if (
    needs.capabilities &&
    !needs.capabilities.every((capability) => hasCapability(view, capability))
  )
    return false;
  if (needs.anyOf && !needs.anyOf.some((capability) => hasCapability(view, capability)))
    return false;
  if (needs.route !== undefined && routeFallback(needs.route, view) !== null) return false;
  return needs.allows ? needs.allows(view) : true;
}

function byModule(registry: readonly ModuleSurfaces[]): ModuleSurfaces[] {
  return [...registry].sort(
    (left, right) => left.order - right.order || left.module.localeCompare(right.module)
  );
}

function collect<T extends SurfaceContribution>(
  registry: readonly ModuleSurfaces[],
  pick: (module: ModuleSurfaces) => readonly T[] | undefined,
  view: AccessView
): Placed<T>[] {
  const seen = new Set<string>();
  const placed: Placed<T>[] = [];
  for (const module of byModule(registry)) {
    for (const surface of pick(module) ?? []) {
      if (seen.has(surface.id)) continue;
      seen.add(surface.id);
      if (surfaceAllowed(module.module, surface.needs, view))
        placed.push({ ...surface, module: module.module });
    }
  }
  return placed;
}

export function resolveSurfaces(
  registry: readonly ModuleSurfaces[],
  view: AccessView
): ResolvedSurfaces {
  const destinations = collect(registry, (module) => module.destinations, view).sort(
    (left, right) => left.order - right.order
  );
  const modules = byModule(registry).flatMap((module): ActiveModule[] => {
    const hub = module.hub;
    if (
      !hub ||
      module.module === MODULE_IDS.core ||
      !surfaceAllowed(module.module, hub.needs, view)
    )
      return [];
    return [
      {
        ...hub,
        module: module.module,
        order: module.order,
        destinations: destinations.filter((destination) => destination.module === module.module),
      },
    ];
  });
  return {
    modules,
    inicio: collect(registry, (module) => module.inicio, view),
    destinations,
    search: new Set(
      collect(registry, (module) => module.search, view).map((surface) => surface.id)
    ),
    actions: new Set(
      collect(registry, (module) => module.actions, view).map((surface) => surface.id)
    ),
  };
}

function duplicates(registry: readonly ModuleSurfaces[], kind: Kind): string[] {
  const counts = new Map<string, number>();
  for (const module of registry)
    for (const surface of module[kind] ?? [])
      counts.set(surface.id, (counts.get(surface.id) ?? 0) + 1);
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => `${kind}:${id} is contributed twice`);
}

function growKeys(surface: InicioSurface): string[] {
  return FORMS.flatMap((form) => {
    const place = surface.places[form];
    return place?.grows ? [`${form}:${place.column ?? ''}`] : [];
  });
}

function growers(registry: readonly ModuleSurfaces[]): string[] {
  const keys = registry.flatMap((module) => (module.inicio ?? []).flatMap(growKeys));
  return [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))].map(
    (key) => `inicio ${key} has two sections that grow`
  );
}

function unplaced(registry: readonly ModuleSurfaces[]): string[] {
  return registry.flatMap((module) =>
    (module.inicio ?? []).flatMap((surface) =>
      (['band', 'wide'] as const)
        .filter((form) => surface.places[form] && !surface.places[form]?.column)
        .map((form) => `inicio:${surface.id} has no column in ${form}`)
    )
  );
}

export function registryProblems(registry: readonly ModuleSurfaces[]): string[] {
  const modules = registry.map((module) => module.module);
  const twice = modules.filter((module, index) => modules.indexOf(module) !== index);
  return [
    ...twice.map((module) => `module ${module} registers twice`),
    ...KINDS.flatMap((kind) => duplicates(registry, kind)),
    ...growers(registry),
    ...unplaced(registry),
  ];
}
