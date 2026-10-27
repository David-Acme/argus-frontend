import { size } from '@/shared/theme/tokens';
import type { HeightClass } from '@/shared/theme/height-layout';

export type SuggestionId =
  'show-camera' | 'who-home' | 'night-mode' | 'today' | 'tomorrow' | 'remind' | 'yes' | 'no';

export type Suggestion = { id: SuggestionId; camera: string | null; send: boolean };

export type SuggestionInput = {
  cameraName: string | null;
  readsPresence: boolean;
  setsMode: boolean;
  readsAgenda: boolean;
  hour: number;
  asking: boolean;
};

export const SUGGESTIONS_SHOWN = 3;

const EVENING_FROM = 19;

const MORNING_UNTIL = 12;

const OPEN_QUESTION =
  /^(qu[eé]|cu[aá]l(es)?|cu[aá]ndo|d[oó]nde|qui[eé]n(es)?|c[oó]mo|cu[aá]nt[oa]s?|por qu[eé]|para qu[eé]|what|which|when|where|who|whom|whose|how|why)(?=[\s,?]|$)/i;

const ANSWERS: readonly Suggestion[] = [
  { id: 'yes', camera: null, send: true },
  { id: 'no', camera: null, send: true },
];

function candidates({
  cameraName,
  readsPresence,
  setsMode,
  readsAgenda,
  hour,
}: SuggestionInput): Suggestion[] {
  const evening = hour >= EVENING_FROM;
  const morning = hour < MORNING_UNTIL;
  const camera: Suggestion[] = cameraName
    ? [{ id: 'show-camera', camera: cameraName, send: true }]
    : [];
  const mode: Suggestion[] = setsMode ? [{ id: 'night-mode', camera: null, send: true }] : [];
  const agenda: Suggestion[] = readsAgenda
    ? [{ id: evening ? 'tomorrow' : 'today', camera: null, send: true }]
    : [];
  const people: Suggestion[] = readsPresence ? [{ id: 'who-home', camera: null, send: true }] : [];
  const remind: Suggestion = { id: 'remind', camera: null, send: false };
  if (evening) return [...mode, ...camera, ...agenda, ...people, remind];
  if (morning) return [...agenda, ...camera, ...people, ...mode, remind];
  return [...camera, ...people, ...agenda, ...mode, remind];
}

export function suggestionsOf(input: SuggestionInput): Suggestion[] {
  if (input.asking) return [...ANSWERS];
  return candidates(input).slice(0, SUGGESTIONS_SHOWN);
}

export function asksYesNo(reply: string | null): boolean {
  const said = reply?.trim() ?? '';
  if (!said.endsWith('?')) return false;
  const question = said.includes('¿')
    ? said.slice(said.lastIndexOf('¿') + 1)
    : (said.split(/(?<=[.!])\s+/).at(-1) ?? said);
  return !OPEN_QUESTION.test(question.trim());
}

export function cameraToSuggest(names: readonly string[], shown: string | null): string | null {
  return names.find((name) => name !== shown) ?? null;
}

export function emptyMarkSizeOf(heightClass: HeightClass, landscape: boolean): number {
  if (landscape || heightClass === 'tiny') return size.presenceMark;
  return heightClass === 'short' ? size.presenceWelcomeTiny : size.presenceThreadEmpty;
}
