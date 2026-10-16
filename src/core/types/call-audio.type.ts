export type CallAudioKind =
  | 'earpiece'
  | 'speaker'
  | 'bluetooth'
  | 'wired'
  | 'streaming'
  | 'microphone'
  | 'output'
  | 'unknown';

export type CallAudioDirection = 'route' | 'input' | 'output';

export type CallAudioDevice = {
  id: string;
  kind: CallAudioKind;
  direction: CallAudioDirection;
  name: string;
  active: boolean;
};

export type CallAudioSupport = {
  devices: boolean;
  routePicker: boolean;
};

export interface ICallAudio {
  readonly support: CallAudioSupport;
  devices(): Promise<CallAudioDevice[]>;
  select(device: CallAudioDevice): Promise<void>;
  showRoutePicker(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
