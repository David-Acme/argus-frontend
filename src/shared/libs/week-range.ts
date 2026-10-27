export type WeekRange = { from: Date; to: Date };

const WEEK_DAYS = 7;
const SUNDAY = 0;

export function weekOf(now: Date): WeekRange {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const day = from.getDay();
  from.setDate(from.getDate() - (day === SUNDAY ? WEEK_DAYS - 1 : day - 1));
  const to = new Date(from);
  to.setDate(to.getDate() + WEEK_DAYS - 1);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}
