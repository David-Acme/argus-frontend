import type { InicioForm, InicioPlace, InicioSurface } from '@/shared/libs/surfaces';

export type InicioPrefs = { hidden: readonly string[]; order: readonly string[] };

export const NO_INICIO_PREFS: InicioPrefs = { hidden: [], order: [] };

const PINNED_BASE = -1000;

const FORMS: readonly InicioForm[] = ['stack', 'first', 'band', 'wide'];

type Placed = Pick<InicioSurface, 'id' | 'places'>;

function rankOf(surface: Placed): number {
  const orders = FORMS.flatMap((form) => {
    const place = surface.places[form];
    return place ? [place.order] : [];
  });
  return orders.length > 0 ? Math.min(...orders) : 0;
}

function reorder(place: InicioPlace | undefined, order: number): InicioPlace | undefined {
  return place ? { ...place, order } : undefined;
}

export function applyInicioPrefs<T extends Placed>(
  surfaces: readonly T[],
  prefs: InicioPrefs
): T[] {
  return surfaces
    .filter((surface) => !prefs.hidden.includes(surface.id))
    .map((surface) => {
      const index = prefs.order.indexOf(surface.id);
      if (index < 0) return surface;
      const order = PINNED_BASE + index;
      return {
        ...surface,
        places: Object.fromEntries(
          FORMS.map((form) => [form, reorder(surface.places[form], order)])
        ),
      };
    });
}

export function orderedSections<T extends Placed>(surfaces: readonly T[], prefs: InicioPrefs): T[] {
  const position = (surface: T) => {
    const index = prefs.order.indexOf(surface.id);
    return index < 0 ? rankOf(surface) : PINNED_BASE + index;
  };
  return [...surfaces].sort((left, right) => position(left) - position(right));
}

export function moveSection(ids: readonly string[], id: string, delta: number): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function toggleHidden(prefs: InicioPrefs, id: string, shown: boolean): InicioPrefs {
  const hidden = prefs.hidden.filter((entry) => entry !== id);
  return { ...prefs, hidden: shown ? hidden : [...hidden, id] };
}
