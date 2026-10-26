export type HelpRow = 'guards' | 'reminds' | 'answers';

export type TryPhrase = 'who-home' | 'night' | 'happened' | 'today';

export type HelpInput = { cameras: boolean; reminders: boolean; voice: boolean };

export type TryInput = { events: boolean; presence: boolean; setsMode: boolean; agenda: boolean };

const shown = <T>(pairs: readonly (readonly [T, boolean])[]): T[] =>
  pairs.filter(([, on]) => on).map(([value]) => value);

export function helpRows({ cameras, reminders, voice }: HelpInput): HelpRow[] {
  return shown<HelpRow>([
    ['guards', cameras],
    ['reminds', reminders],
    ['answers', voice],
  ]);
}

export function tryPhrases({ events, presence, setsMode, agenda }: TryInput): TryPhrase[] {
  return shown<TryPhrase>([
    ['who-home', presence],
    ['night', setsMode],
    ['happened', events],
    ['today', agenda],
  ]);
}
