import { lazyScreen } from '@/shared/libs/lazy-screen';
export { ProximitySection } from './components/proximity-section';
export { useBeaconController } from './hooks/use-beacon-controller';
export const ProximityDevicesScreen = lazyScreen(
  () => import('./screens/proximity-screens'),
  'ProximityDevicesScreen'
);
export const ProximityPeopleScreen = lazyScreen(
  () => import('./screens/proximity-screens'),
  'ProximityPeopleScreen'
);
