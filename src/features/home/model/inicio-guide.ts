export type HelpRow = 'guards' | 'reminds' | 'answers';

export type HelpInput = { cameras: boolean; reminders: boolean; voice: boolean };

const shown = <T>(pairs: readonly (readonly [T, boolean])[]): T[] =>
  pairs.filter(([, on]) => on).map(([value]) => value);

export function helpRows({ cameras, reminders, voice }: HelpInput): HelpRow[] {
  return shown<HelpRow>([
    ['guards', cameras],
    ['reminds', reminders],
    ['answers', voice],
  ]);
}
