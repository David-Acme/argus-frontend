
export interface ICalendarEventCreate {
  title: string;
  description?: string;
  location?: string;
  color?: string;
  startsAt: number;
  endsAt?: number;
  isAllDay?: boolean;
  recurrenceRule?: string;
  projectId?: number;
}

export type ICalendarEventUpdate = Partial<
  Omit<ICalendarEventCreate, 'description' | 'location' | 'endsAt'>
> & {
  description?: string | null;
  location?: string | null;
  endsAt?: number | null;
};

