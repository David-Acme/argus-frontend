import {
  type HybridView,
  type HybridViewMethods,
  type HybridViewProps,
} from 'react-native-nitro-modules';

export interface ArgusCameraViewProps extends HybridViewProps {
  active: boolean;
  muted: boolean;
}

export interface ArgusCameraViewMethods extends HybridViewMethods {
  resetStream(): void;
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  bufferedBytes(): number;
}

export type ArgusCameraView = HybridView<
  ArgusCameraViewProps,
  ArgusCameraViewMethods,
  { ios: 'swift', android: 'kotlin' }
>;
