import type { InicioColumnId, InicioForm, InicioSurface } from '@/shared/libs/surfaces';
import { size } from '@/shared/theme/tokens';
import type { StatPlace } from './inicio-stats';

export type InicioSignal = 'news' | 'tiles' | 'watch' | 'night' | 'day' | 'sparse' | 'tablet';

export type InicioSignals = ReadonlySet<InicioSignal | string>;

export type InicioColumn = {
  id: InicioColumnId | 'lead';
  sections: readonly string[];
  grows: number;
  width?: number;
  max?: number;
};

type ColumnFrame = { id: InicioColumnId; width?: number; max?: number };

type ColumnPlan = ColumnFrame & { sections: string[]; grow?: string };

export const LEAD = 'lead';

const BAND_COLUMNS: readonly ColumnFrame[] = [
  { id: 'agenda', width: size.columnSide },
  { id: 'news' },
  { id: 'side', width: size.columnAside },
];

const WIDE_COLUMNS: readonly ColumnFrame[] = [
  { id: 'agenda', width: size.columnWide },
  { id: 'news', max: size.columnFeed },
  { id: 'cameras' },
  { id: 'side', width: size.columnWide },
];

type Slot = { id: string; order: number; column?: InicioColumnId; grows?: boolean };

function slotsOf(
  surfaces: readonly Pick<InicioSurface, 'id' | 'places'>[],
  form: InicioForm,
  signals: InicioSignals
): Slot[] {
  return surfaces
    .flatMap((surface) => {
      const place = surface.places[form];
      if (!place || (place.when !== undefined && !signals.has(place.when))) return [];
      return [{ id: surface.id, order: place.order, column: place.column, grows: place.grows }];
    })
    .sort((left, right) => left.order - right.order);
}

function flexible(columns: ColumnPlan[]): ColumnPlan[] {
  if (columns.some((column) => column.width === undefined)) return columns;
  return columns.map((column, index) =>
    index === columns.length - 1 ? { ...column, width: undefined } : column
  );
}

export function inicioColumns(
  place: StatPlace,
  surfaces: readonly Pick<InicioSurface, 'id' | 'places'>[],
  signals: InicioSignals
): InicioColumn[] {
  const form: InicioForm = place === 'band' ? 'band' : 'wide';
  const slots = slotsOf(surfaces, form, signals);
  const plans = (form === 'band' ? BAND_COLUMNS : WIDE_COLUMNS).map((frame): ColumnPlan => {
    const mine = slots.filter((slot) => slot.column === frame.id);
    return {
      ...frame,
      sections: mine.map((slot) => slot.id),
      grow: mine.find((slot) => slot.grows)?.id,
    };
  });
  const filled = plans.filter((column) => column.sections.length > 0);
  const [first, ...rest] = flexible(filled);
  if (!first) return [{ id: LEAD, sections: [LEAD], grows: -1 }];
  const lead: ColumnPlan = { ...first, sections: [LEAD, ...first.sections] };
  return [lead, ...rest].map(({ grow, ...column }) => ({
    ...column,
    grows: grow === undefined ? -1 : column.sections.indexOf(grow),
  }));
}

export function inicioStack(
  surfaces: readonly Pick<InicioSurface, 'id' | 'places'>[],
  signals: InicioSignals,
  firstStep: boolean
): string[] {
  return [
    LEAD,
    ...slotsOf(surfaces, firstStep ? 'first' : 'stack', signals).map((slot) => slot.id),
  ];
}
