import { useRouter } from 'expo-router';
import { ASSISTANT_THREAD_HREF, CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { setAssistantDraft } from '@/features/voice';

export type AskArgus = (draft: string) => void;

export function useAskArgus(): AskArgus | null {
  const router = useRouter();
  const { has } = useCapabilities();
  if (!has(CAPABILITY.messagesRelay)) return null;
  return (draft) => {
    setAssistantDraft(draft);
    router.push(ASSISTANT_THREAD_HREF);
  };
}
