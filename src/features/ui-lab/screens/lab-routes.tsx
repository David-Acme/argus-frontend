import { Redirect } from 'expo-router';
import { lazyScreen } from '@/shared/libs/lazy-screen';
import { labAllowed, spikesAllowed } from '../model/lab-access';

const Lab = lazyScreen(() => import('./lab-screens'), 'UiLabScreen');

const Spikes = lazyScreen(() => import('./lab-screens'), 'SpikesScreen');

export function UiLabRoute() {
  if (!labAllowed(__DEV__)) return <Redirect href="/" />;
  return <Lab />;
}

export function SpikesRoute() {
  if (!spikesAllowed(__DEV__)) return <Redirect href="/" />;
  return <Spikes />;
}
