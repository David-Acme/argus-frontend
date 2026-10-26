import { secureRandomBytes } from '@/core/services/crypto-random';
import { synchronizeService } from '@/core/services/sync';
import { IS_NATIVE } from '@/shared/constants';
import { voiceLegOf } from '@/features/voice/model/voice-leg';
import { voiceService } from '@/features/voice/services/voice';
import { assistantSocket } from '@/features/voice/services/voice/assistant-socket';
import { AssistantChat } from './assistant-chat';
import { uuidFromBytes } from './client-id';

export const assistantChat = new AssistantChat({
  transport: {
    ensureConnected: () => synchronizeService.ensureConnected(),
    send: (type, payload) => synchronizeService.send(type, payload),
    onType: (type, listener) => synchronizeService.onType(type, listener),
    onConnect: (listener) => synchronizeService.onConnect(listener),
    onDisconnect: (listener) => synchronizeService.onDisconnect(listener),
  },
  socket: assistantSocket,
  newClientId: () => uuidFromBytes(secureRandomBytes(16)),
  leg: voiceLegOf(IS_NATIVE),
  now: () => Date.now(),
  callActive: () => voiceService.isActive,
  schedule: (run, ms) => {
    const timer = setTimeout(run, ms);
    return () => clearTimeout(timer);
  },
});

export const setAssistantDraft = (draft: string): void => assistantChat.setDraft(draft);
