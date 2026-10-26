import type { AgendaItem } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import type { ItemActions } from '@/features/agenda/hooks/use-item-actions';
import type { MonthCell } from '@/features/agenda/model/agenda-days';
import type { LineContext } from '@/features/agenda/model/agenda-lines';

export type AgendaView = 'agenda' | 'day';

export type ProjectOption = { id: string; name: string };

export type AsideMonth = {
  cells: readonly MonthCell[];
  names: DayNames;
  shift: MonthShift;
  onPick: (at: number) => void;
};

export type DetailHandlers = {
  onEdit?: (item: AgendaItem) => void;
  onShare?: (item: AgendaItem) => void;
};

export type ListContext = LineContext & {
  date: DateFormatter;
  actions: ItemActions;
  selected: string | null;
  onOpen: (item: AgendaItem) => void;
};

export type DayNames = {
  letter: (at: number) => string;
  number: (at: number) => string;
  full: (at: number) => string;
};

export type MonthShift = {
  title: string;
  previous: string;
  next: string;
  onShift: (step: number) => void;
};
