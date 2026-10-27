import { size } from '@/shared/theme/tokens';
import type { HeightClass } from '@/shared/theme/height-layout';

export type SuggestionId =
  'show-camera' | 'who-home' | 'night-mode' | 'today' | 'tomorrow' | 'remind';

export type Suggestion = { id: SuggestionId; camera: string | null; send: boolean };

export type SuggestionInput = {
  cameraName: string | null;
  readsPresence: boolean;
  setsMode: boolean;
  readsAgenda: boolean;
  hour: number;
};

export const SUGGESTIONS_SHOWN = 3;

const EVENING_FROM = 19;

const MORNING_UNTIL = 12;

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
  return candidates(input).slice(0, SUGGESTIONS_SHOWN);
}

export function emptyMarkSizeOf(heightClass: HeightClass, landscape: boolean): number {
  if (landscape || heightClass === 'tiny') return size.presenceMark;
  return heightClass === 'short' ? size.presenceWelcomeTiny : size.presenceThreadEmpty;
}
