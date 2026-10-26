import { useCallAudio } from '@/features/voice/hooks/use-call-audio';
import { speakerActionOf } from '@/features/voice/model/call-speaker';

export type CallSpeaker = {
  available: boolean;
  on: boolean;
  press: () => void;
};

export function useCallSpeaker(openPicker: () => void): CallSpeaker {
  const audio = useCallAudio(true);
  const action = speakerActionOf(audio.devices);
  const press = () => {
    if (action.kind === 'pick') openPicker();
    if (action.kind === 'toggle') audio.select(action.target);
  };
  return { available: action.kind !== 'none', on: action.kind !== 'none' && action.on, press };
}
