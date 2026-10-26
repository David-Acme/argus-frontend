import { Redirect } from 'expo-router';
import { lazy, Suspense } from 'react';
import { labAllowed, spikesAllowed } from '../model/lab-access';

const importLabScreens = () => import('./lab-screens');
let labScreensModule: ReturnType<typeof importLabScreens> | undefined;
const labScreens = () => (labScreensModule ??= importLabScreens());

const Lab = lazy(async () => ({ default: (await labScreens()).UiLabScreen }));

const Spikes = lazy(async () => ({ default: (await labScreens()).SpikesScreen }));

export function UiLabRoute() {
  if (!labAllowed(__DEV__)) return <Redirect href="/" />;
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}

export function SpikesRoute() {
  if (!spikesAllowed(__DEV__)) return <Redirect href="/" />;
  return (
    <Suspense fallback={null}>
      <Spikes />
    </Suspense>
  );
}
