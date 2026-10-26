import { lazyScreen } from '@/shared/libs/lazy-screen';
export { CallPill } from './components/call-pill';
export { CallPreferencesSection } from './components/call-preferences-section';
export { CallSurface } from './components/call-surface';
export { IncomingCallSurface } from './components/incoming-call-surface';
export { VoiceWebNotice } from './components/voice-web-notice';
export { callLockedId } from './model/call-lock';
export { currentCallLockRedirect, outsideCallLockId } from './model/call-lock-state';
export { useCall } from './hooks/use-call';
export { useCallPush } from './hooks/use-call-push';
export { useDesktopBridge } from './hooks/use-desktop-bridge';
export { useVoiceCallActive } from './hooks/use-voice-call-active';
export const CallScreen = lazyScreen(() => import('./screens/call-screen'), 'default');
export { argusCallSupported, createVoiceMic, voiceCallSupported } from './services/voice';
export { isVoiceCallActive } from './services/voice/voice-activity';
export {
  completeWatchHandoff,
  continueWatchConversation,
  watchContinuationSupported,
} from './services/voice/watch-continuation';
export { useAssistantChat, type AssistantChatState } from './hooks/use-assistant-chat';
export { setAssistantDraft } from './services/chat';
export { ASSISTANT_CHAT_MAX_CHARS } from './constants/voice';
