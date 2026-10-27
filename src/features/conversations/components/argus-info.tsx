import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Sheet, useOpenedOnce } from '@/shared/ui/sheet';
import { ContextPanel } from '@/features/conversations/components/context-panel';

export type ArgusInfoProps = { open: boolean; onClose: () => void; onConversations: () => void };

export function ArgusInfo({ open, onClose, onConversations }: ArgusInfoProps) {
  const { t } = useTranslation();
  const mounted = useOpenedOnce(open);
  if (!mounted) return null;
  return (
    <Sheet open={open} onClose={onClose} title={t('screens.conversations.argus')} long>
      <Row
        title={t('screens.conversations.see-list')}
        leading={<Icon name="chat" />}
        chevron
        onPress={() => {
          onClose();
          onConversations();
        }}
      />
      <ContextPanel />
    </Sheet>
  );
}
