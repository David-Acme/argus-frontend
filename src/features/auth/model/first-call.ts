export type CallStepInput = {
  supported: boolean;
  loaded: boolean;
  microphone: boolean;
};

export type CallStep = 'call' | 'wait' | 'skip';

export function callStepOf({ supported, loaded, microphone }: CallStepInput): CallStep {
  if (!supported) return 'skip';
  if (!loaded) return 'wait';
  return microphone ? 'call' : 'skip';
}
