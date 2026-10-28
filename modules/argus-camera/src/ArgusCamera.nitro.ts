import {
  type HybridView,
  type HybridViewMethods,
  type HybridViewProps,
} from 'react-native-nitro-modules';

export interface ArgusCameraViewProps extends HybridViewProps {
  active: boolean;
  muted: boolean;
  fill: boolean;
  onAudioFailed?: (stopped: boolean) => void;
  onMediaState?: (state: string) => void;
  onFirstFrame?: () => void;
}

export interface ArgusCameraViewMethods extends HybridViewMethods {
  resetStream(): void;
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  bufferedBytes(): number;
  loadMedia(data: ArrayBuffer, key: string): void;
  adoptMedia(key: string): boolean;
  releaseMedia(key: string): void;
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  setRate(rate: number): void;
  mediaPositionMs(): number;
  mediaDurationMs(): number;
  mediaBufferedMs(): number;
}

export type ArgusCameraView = HybridView<
  ArgusCameraViewProps,
  ArgusCameraViewMethods,
  { ios: 'swift'; android: 'kotlin' }
>;
