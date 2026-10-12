import { AppState } from 'react-native';
import { IS_WEB } from '@/shared/constants';

let watching = false;

export function watchReconnectOpportunities(retry: () => void): () => void {
  if (watching) return () => undefined;
  watching = true;
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') retry();
  });
  const online = IS_WEB && typeof window !== 'undefined' ? window.addEventListener('online', retry) : undefined;
  return () => {
    watching = false;
    appState.remove();
    if (online !== undefined && typeof window !== 'undefined') window.removeEventListener('online', retry);
  };
}
