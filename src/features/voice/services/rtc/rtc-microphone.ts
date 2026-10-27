import { chosenMicrophone, useMicrophoneStore } from '@/shared/libs/microphone';
import type { MicrophoneSource } from './rtc-livekit';

export const webMicrophone: MicrophoneSource = {
  chosen: chosenMicrophone,
  watch: (onChange) =>
    useMicrophoneStore.subscribe((state, previous) => {
      if (state.choice?.deviceId !== previous.choice?.deviceId) onChange(state.choice);
    }),
};
