import {
  type HybridView,
  type HybridViewMethods,
  type HybridViewProps,
} from 'react-native-nitro-modules';

/** Props of the native camera surface. */
export interface ArgusCameraViewProps extends HybridViewProps {
  /** Pauses rendering while false; the stream itself stays open. */
  active: boolean;
}

/** Imperative surface: the JS stream service pumps fMP4 bytes into the decoder. */
export interface ArgusCameraViewMethods extends HybridViewMethods {
  /** Drops buffered data and waits for a fresh init segment. */
  resetStream(): void;
  /** Appends one fMP4 fragment; type 1 = init segment, type 2 = media. */
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  /** Bytes queued for the decoder; drives the server credit-window acks. */
  bufferedBytes(): number;
}

export type ArgusCameraView = HybridView<
  ArgusCameraViewProps,
  ArgusCameraViewMethods,
  { ios: 'swift', android: 'kotlin' }
>;
