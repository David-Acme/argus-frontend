import { getHostComponent } from 'react-native-nitro-modules';

import type {
  ArgusCameraViewMethods,
  ArgusCameraViewProps,
} from './ArgusCamera.nitro';

export const ArgusCameraView = getHostComponent<
  ArgusCameraViewProps,
  ArgusCameraViewMethods
>('ArgusCameraView', () =>
  require('../nitrogen/generated/shared/json/ArgusCameraViewConfig.json'),
);

export type {
  ArgusCameraViewMethods,
  ArgusCameraViewProps,
} from './ArgusCamera.nitro';
