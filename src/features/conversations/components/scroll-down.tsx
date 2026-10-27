import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useKeyboardTruth } from '@/shared/hooks/use-keyboard-truth';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { UNREAD_BADGE_MAX } from '@/features/conversations/constants/conversation.constant';
import type { StickyOffset } from '@/features/conversations/model/thread-list';

export type ScrollDownProps = { unseen: number; onPress: () => void; offset: StickyOffset };

const FLOAT = { position: 'absolute', right: 0, bottom: 12 } as const;

const BADGE = { position: 'absolute', top: -6, right: -2 } as const;

export function ScrollDown({ unseen, onPress, offset }: ScrollDownProps) {
  const { t } = useTranslation();
  const sticky = useKeyboardTruth();
  const go = t('screens.conversations.latest.go');
  const count =
    unseen === 1
      ? t('screens.conversations.latest.one')
      : unseen > 1
        ? t('screens.conversations.latest.many', { count: String(unseen) })
        : null;
  return (
    <KeyboardStickyView enabled={sticky} offset={offset} pointerEvents="box-none" style={FLOAT}>
      <PressableSurface
        a11y={{ label: count ? `${count}. ${go}` : go, role: 'button' }}
        onPress={onPress}
        pressed={{ scale: 'icon' }}
        className="bg-surface border-line size-scroll-down items-center justify-center rounded-full border">
        <Icon name="chevsd" size="small" tone="text-2" />
      </PressableSurface>
      {unseen > 0 ? (
        <View
          style={BADGE}
          pointerEvents="none"
          className="bg-accent min-w-unread-badge h-unread-badge items-center justify-center rounded-full px-1">
          <Text variant="caption" tone="on-ink">
            {unseen > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : String(unseen)}
          </Text>
        </View>
      ) : null}
    </KeyboardStickyView>
  );
}
