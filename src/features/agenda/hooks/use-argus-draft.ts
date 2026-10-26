import { useRouter } from 'expo-router';
import { ASSISTANT_THREAD_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { setAssistantDraft } from '@/features/voice';

export type ArgusDraft = (text: string) => void;

export function useArgusDraft(): ArgusDraft | null {
  const router = useRouter();
  const { has } = useCapabilities();
  if (!has(CAPABILITY.messagesRelay)) return null;
  return (text) => {
    setAssistantDraft(text);
    router.push(ASSISTANT_THREAD_HREF);
  };
}
