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
  | 'reminders';

export type InicioReads = {
  agenda: boolean;
  news: boolean;
  cameras: boolean;
  people: boolean;
};

export type InicioColumnId = 'agenda' | 'news' | 'cameras' | 'side' | 'lead';

export type InicioColumn = {
  id: InicioColumnId;
  sections: readonly InicioSection[];
  grows: number;
  width?: number;
  max?: number;
};

type ColumnPlan = Omit<InicioColumn, 'grows'> & { grow: InicioSection };

const AGENDA: readonly InicioSection[] = ['now', 'today', 'tomorrow'];

function plans(place: StatPlace, reads: InicioReads): ColumnPlan[] {
  const agenda = reads.agenda ? AGENDA : [];
  const news: InicioSection[] = reads.news ? ['news'] : [];
  if (place === 'band')
    return [
      { id: 'agenda', sections: agenda, grow: 'today', width: size.columnSide },
      { id: 'news', sections: news, grow: 'news' },
      {
        id: 'side',
        sections: [
          ...(reads.cameras ? ['cameras' as const] : []),
          ...(reads.people ? ['people' as const] : []),
        ],
        grow: 'cameras',
        width: size.columnAside,
      },
    ];
  return [
    { id: 'agenda', sections: agenda, grow: 'today', width: size.columnWide },
    { id: 'news', sections: news, grow: 'news', max: size.columnFeed },
    { id: 'cameras', sections: reads.cameras ? ['cameras', 'happened'] : [], grow: 'cameras' },
    {
      id: 'side',
      sections: [
        ...(reads.people ? ['people' as const] : []),
        ...(reads.agenda ? ['projects' as const] : []),
        ...(reads.cameras ? ['clips' as const] : []),
        ...(reads.agenda ? ['reminders' as const] : []),
      ],
      grow: reads.people ? 'people' : 'projects',
      width: size.columnWide,
    },
  ];
}

function growIndex(sections: readonly InicioSection[], grow: InicioSection): number {
  const index = sections.indexOf(grow);
  return index >= 0 ? index : sections.length - 1;
}

function flexible(columns: ColumnPlan[]): ColumnPlan[] {
  if (columns.some((column) => column.width === undefined)) return columns;
  return columns.map((column, index) =>
    index === columns.length - 1 ? { ...column, width: undefined } : column
  );
}

export function inicioColumns(place: StatPlace, reads: InicioReads): InicioColumn[] {
  const filled = plans(place, reads).filter((column) => column.sections.length > 0);
  const [first, ...rest] = flexible(
    filled.length > 0 ? filled : [{ id: 'lead', sections: [], grow: 'lead' }]
  );
  if (!first) return [];
  const lead: ColumnPlan = { ...first, sections: ['lead', ...first.sections] };
  return [lead, ...rest].map(({ grow, ...column }) => ({
    ...column,
    grows: growIndex(column.sections, grow),
  }));
}

export function inicioStack(reads: InicioReads, firstStep: boolean): InicioSection[] {
  if (firstStep) return ['lead'];
  return [
    'lead',
    ...(reads.agenda ? ['now' as const] : []),
    ...(reads.cameras ? ['cameras' as const] : []),
    ...(reads.news ? ['news' as const] : []),
  ];
}
