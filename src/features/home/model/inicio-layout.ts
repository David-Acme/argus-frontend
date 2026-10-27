import { size } from '@/shared/theme/tokens';
import type { StatPlace } from './inicio-stats';

export type InicioSection =
  | 'lead'
  | 'now'
  | 'today'
  | 'tomorrow'
  | 'news'
  | 'cameras'
  | 'happened'
  | 'people'
  | 'projects'
  | 'clips'
  | 'watch'
  | 'system'
  | 'help';

export type InicioReads = {
  agenda: boolean;
  news: boolean;
  cameras: boolean;
  tiles: boolean;
  people: boolean;
  watch: boolean;
  night: boolean;
  system: boolean;
  sparse: boolean;
};

export type InicioColumnId = 'agenda' | 'news' | 'cameras' | 'side' | 'lead';

export type InicioColumn = {
  id: InicioColumnId;
  sections: readonly InicioSection[];
  grows: number;
  width?: number;
  max?: number;
};

type ColumnPlan = Omit<InicioColumn, 'grows'> & { grow?: InicioSection };

const AGENDA: readonly InicioSection[] = ['now', 'today', 'tomorrow'];

const when = (shown: boolean, ...sections: InicioSection[]): InicioSection[] =>
  shown ? sections : [];

function bandPlans(reads: InicioReads): ColumnPlan[] {
  return [
    {
      id: 'agenda',
      sections: [...when(reads.watch, 'watch'), ...when(reads.agenda, ...AGENDA)],
      width: size.columnSide,
    },
    { id: 'news', sections: when(reads.news, 'news') },
    {
      id: 'side',
      sections: [
        ...when(reads.cameras && reads.tiles, 'cameras'),
        ...when(reads.people, 'people'),
        ...when(reads.system && reads.sparse, 'system'),
        ...when(reads.sparse, 'help'),
      ],
      grow: 'cameras',
      width: size.columnAside,
    },
  ];
}

function widePlans(reads: InicioReads): ColumnPlan[] {
  return [
    {
      id: 'agenda',
      sections: [...when(reads.watch, 'watch'), ...when(reads.agenda, ...AGENDA)],
      width: size.columnWide,
    },
    { id: 'news', sections: when(reads.news, 'news'), max: size.columnFeed },
    {
      id: 'cameras',
      sections: [
        ...when(reads.cameras && reads.tiles, 'cameras'),
        ...when(reads.cameras, 'happened'),
      ],
      grow: 'cameras',
    },
    {
      id: 'side',
      sections: [
        ...when(reads.people, 'people'),
        ...when(reads.agenda, 'projects'),
        ...when(reads.cameras, 'clips'),
        ...when(reads.system, 'system'),
        ...when(reads.sparse, 'help'),
      ],
      width: size.columnWide,
    },
  ];
}

function growIndex(sections: readonly InicioSection[], grow: InicioSection | undefined): number {
  return grow === undefined ? -1 : sections.indexOf(grow);
}

function flexible(columns: ColumnPlan[]): ColumnPlan[] {
  if (columns.some((column) => column.width === undefined)) return columns;
  return columns.map((column, index) =>
    index === columns.length - 1 ? { ...column, width: undefined } : column
  );
}

export function inicioColumns(place: StatPlace, reads: InicioReads): InicioColumn[] {
  const plans = place === 'band' ? bandPlans(reads) : widePlans(reads);
  const filled = plans.filter((column) => column.sections.length > 0);
  const [first, ...rest] = flexible(filled.length > 0 ? filled : [{ id: 'lead', sections: [] }]);
  if (!first) return [];
  const lead: ColumnPlan = { ...first, sections: ['lead', ...first.sections] };
  return [lead, ...rest].map(({ grow, ...column }) => ({
    ...column,
    grows: growIndex(column.sections, grow),
  }));
}

export function inicioStack(
  reads: InicioReads,
  firstStep: boolean,
  tablet = false
): InicioSection[] {
  if (firstStep)
    return [
      'lead',
      ...when(reads.news, 'news'),
      ...when(reads.system, 'system'),
      ...when(tablet, 'help'),
      ...when(tablet && reads.agenda, 'today'),
    ];
  return [
    'lead',
    ...when(reads.watch, 'watch'),
    ...when(reads.agenda, reads.night ? 'tomorrow' : 'now'),
    ...when(reads.cameras && reads.tiles, 'cameras'),
    ...when(reads.news, 'news'),
  ];
}
