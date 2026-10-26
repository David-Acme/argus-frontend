import { Redirect } from 'expo-router';
import { lazyScreen } from '@/shared/libs/lazy-screen';
import { labAllowed, spikesAllowed } from '../model/lab-access';

const labScreens = () => import('./lab-screens');

const Lab = lazyScreen(labScreens, 'UiLabScreen');

const Spikes = lazyScreen(labScreens, 'SpikesScreen');

export function UiLabRoute() {
  if (!labAllowed(__DEV__)) return <Redirect href="/" />;
  return <Lab />;
}

export function SpikesRoute() {
  if (!spikesAllowed(__DEV__)) return <Redirect href="/" />;
  return <Spikes />;
}
