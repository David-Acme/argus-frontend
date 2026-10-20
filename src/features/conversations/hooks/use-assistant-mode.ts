import { useState } from 'react';
import type { AssistantMode } from '@/core/types';
import { CAPABILITY, IS_NATIVE } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import {
  assistantModes,
  readAssistantMode,
  rememberAssistantMode,
  resolveAssistantMode,
} from '@/shared/libs/assistant-mode';
import { voiceCallSupported } from '@/features/voice';
import { argusAvailability } from '@/features/conversations/model/composer';

export type AssistantModeState = {
  mode: AssistantMode | null;
  modes: readonly AssistantMode[];
  choose: (mode: AssistantMode) => void;
};

export function useAssistantMode(): AssistantModeState {
  const { has } = useCapabilities();
  const available = argusAvailability({
    voiceAllowed: has(CAPABILITY.assistantVoice),
    voiceSupported: voiceCallSupported(),
    chatAllowed: has(CAPABILITY.messagesRelay),
  });
  const [chosen, setChosen] = useState<AssistantMode | null>(readAssistantMode);
  const mode = resolveAssistantMode({ ...available, stored: chosen, native: IS_NATIVE });
  const modes = assistantModes(available);

  const choose = (next: AssistantMode) => {
    rememberAssistantMode(next);
    setChosen(next);
  };

  return { mode, modes, choose };
}
