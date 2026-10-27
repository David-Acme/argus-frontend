import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { hasMenuItems, Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type HeaderStatus = { text: string; typing: boolean };

export type ThreadHeaderProps = {
  avatar: ReactNode;
  title: string;
  status: HeaderStatus | null;
  onBack: (() => void) | null;
  onInfo: (() => void) | null;
  onCall: (() => void) | null;
  menu: readonly MenuItem[];
};

export type ArgusHeaderProps = Pick<ThreadHeaderProps, 'onBack' | 'onInfo' | 'onCall' | 'menu'> & {
  typing: boolean;
  desktop: boolean;
};

export type MemberHeaderProps = Pick<ThreadHeaderProps, 'onBack' | 'menu'> & {
  name: string;
  typing: boolean;
};

type IdentityProps = Pick<ThreadHeaderProps, 'avatar' | 'title' | 'status'>;

function Identity({ avatar, title, status }: IdentityProps) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      {avatar}
      <View className="min-w-0 flex-1">
        <Text variant="headline" heading={1} numberOfLines={1}>
          {title}
        </Text>
        {status ? (
          <Text variant="caption" tone={status.typing ? 'accent' : '2'} numberOfLines={1}>
            {status.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ThreadHeader({
  avatar,
  title,
  status,
  onBack,
  onInfo,
  onCall,
  menu,
}: ThreadHeaderProps) {
  const { t } = useTranslation();
  const identity = <Identity avatar={avatar} title={title} status={status} />;
  return (
    <View className="border-line min-h-top-bar flex-row items-center gap-1 border-b px-2 py-2">
      {onBack ? (
        <Button iconOnly icon="back" label={t('screens.conversations.back')} onPress={onBack} />
      ) : null}
      {onInfo ? (
        <PressableSurface
          a11y={{ label: t('screens.conversations.info', { name: title }), role: 'button' }}
          onPress={onInfo}
          pressed={{ scale: 'surface', grow: true }}
          className="min-w-0 flex-1 px-1">
          {identity}
        </PressableSurface>
      ) : (
        <View className="min-w-0 flex-1 px-2">{identity}</View>
      )}
      {onCall ? (
        <Button iconOnly icon="phone" label={t('screens.conversations.call')} onPress={onCall} />
      ) : null}
      {hasMenuItems(menu) ? <Menu label={t('screens.conversations.more')} items={menu} /> : null}
    </View>
  );
}

export function ArgusHeader({ typing, desktop, ...props }: ArgusHeaderProps) {
  const { t } = useTranslation();
  const idle = desktop
    ? t('screens.conversations.argus-meta-desktop')
    : t('screens.conversations.argus-meta');
  return (
    <ThreadHeader
      {...props}
      avatar={<Presence state="idle" size={size.presenceThreadHead} paused />}
      title={t('screens.conversations.argus')}
      status={{
        text: typing ? t('screens.conversations.typing-status') : idle,
        typing,
      }}
    />
  );
}

export function MemberHeader({ name, typing, onBack, menu }: MemberHeaderProps) {
  const { t } = useTranslation();
  return (
    <ThreadHeader
      avatar={<Avatar initial={name.charAt(0).toLocaleUpperCase()} round />}
      title={name}
      status={typing ? { text: t('screens.conversations.typing-status'), typing } : null}
      onBack={onBack}
      onInfo={null}
      onCall={null}
      menu={menu}
    />
  );
}
