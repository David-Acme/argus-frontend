import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type ArgusHeaderProps = {
  desktop: boolean;
  onBack: (() => void) | null;
  onConversations: (() => void) | null;
  onCall: (() => void) | null;
  onClear: (() => void) | null;
};

export type MemberHeaderProps = {
  name: string;
  onBack: (() => void) | null;
  onClear: (() => void) | null;
};

type ClearProps = { onClear: () => void };

function Clear({ onClear }: ClearProps) {
  const { t } = useTranslation();
  return (
    <Button
      compact
      variant="ghost"
      label={{
        shown: t('screens.conversations.clear-short'),
        spoken: t('screens.conversations.clear'),
      }}
      onPress={onClear}
    />
  );
}

function ArgusTitle({
  desktop,
  onConversations,
}: Pick<ArgusHeaderProps, 'desktop' | 'onConversations'>) {
  const { t } = useTranslation();
  const meta = desktop
    ? t('screens.conversations.argus-meta-desktop')
    : t('screens.conversations.argus-meta');
  const title = (
    <View className="flex-row items-center gap-1">
      <Text variant="headline" heading={1}>
        {t('screens.conversations.argus')}
      </Text>
      {onConversations ? <Icon name="chevd" size="small" tone="text-2" /> : null}
    </View>
  );
  return (
    <View className="min-w-0 flex-1">
      {onConversations ? (
        <PressableSurface
          a11y={{ label: t('screens.conversations.open-list'), role: 'button' }}
          onPress={onConversations}
          pressed={{ scale: 'surface' }}>
          {title}
        </PressableSurface>
      ) : (
        title
      )}
      <Text variant="caption" tone="3">
        {meta}
      </Text>
    </View>
  );
}

export function ArgusHeader({
  desktop,
  onBack,
  onConversations,
  onCall,
  onClear,
}: ArgusHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="border-line min-h-top-bar flex-row items-center gap-3 border-b px-4 py-2">
      {onBack ? (
        <Button
          iconOnly
          glass
          icon="back"
          label={t('screens.conversations.back')}
          onPress={onBack}
        />
      ) : null}
      <Presence state="idle" size={size.presenceThreadHead} paused />
      <ArgusTitle desktop={desktop} onConversations={onConversations} />
      {onClear ? <Clear onClear={onClear} /> : null}
      {onCall ? (
        <Button
          iconOnly
          filled
          icon="phone"
          label={t('screens.conversations.call')}
          onPress={onCall}
        />
      ) : null}
    </View>
  );
}

export function MemberHeader({ name, onBack, onClear }: MemberHeaderProps) {
  const { t } = useTranslation();
  return (
    <View className="border-line min-h-top-bar flex-row items-center gap-2 border-b px-4 py-2">
      {onBack ? (
        <Button
          iconOnly
          glass
          icon="back"
          label={t('screens.conversations.back')}
          onPress={onBack}
        />
      ) : null}
      <View className="min-w-0 flex-1">
        <Text variant="headline" heading={1} numberOfLines={1}>
          {name}
        </Text>
      </View>
      {onClear ? <Clear onClear={onClear} /> : null}
    </View>
  );
}
