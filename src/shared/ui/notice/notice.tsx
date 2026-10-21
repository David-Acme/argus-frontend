import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { size, typeRoles, useThemeTokens, useWindowLayout } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type NoticeTone = 'info' | 'attention';

export type NoticeAction = {
  label: string;
  onPress: () => void | Promise<unknown>;
  primary?: boolean;
  icon?: IconGlyph;
};

export type NoticeProps = {
  title: string;
  body?: string;
  tone?: NoticeTone;
  icon?: IconGlyph;
  action?: NoticeAction;
  inline?: boolean;
  leading?: ReactNode;
  testID?: string;
};

type CardProps = Omit<NoticeProps, 'inline'>;

type BannerProps = Omit<NoticeProps, 'inline' | 'leading'>;

type CardActionProps = { action: NoticeAction; block: boolean };

const LINK_SLOP = (size.target - size.targetMin) / 2;

const BANNER_LINK_SLOP = (size.target - typeRoles.label.line) / 2;

function CardAction({ action, block }: CardActionProps) {
  const button = (
    <Button
      label={action.label}
      onPress={action.onPress}
      variant={action.primary ? 'primary' : 'secondary'}
      icon={action.icon}
      compact={!block}
      block={block}
    />
  );
  if (block) return button;
  return <View className="gap-notice-action-gap flex-row justify-end">{button}</View>;
}

function NoticeCard({ title, body, tone = 'info', icon, action, leading, testID }: CardProps) {
  const { elevation } = useThemeTokens();
  const { windowClass } = useWindowLayout();
  const card = { boxShadow: elevation.card };
  const well = icon ? (
    <Avatar icon={icon} tone={tone === 'attention' ? 'attn' : 'ok'} size="small" />
  ) : null;
  return (
    <View
      role="status"
      testID={testID}
      className="rounded-notice bg-surface gap-notice-gap px-notice-x py-notice-y"
      style={card}>
      <View
        className={clsx('gap-notice-head-gap flex-row', leading ? 'items-center' : 'items-start')}>
        {leading ?? well}
        <View className="min-w-0 flex-1">
          <Text variant="noticeTitle">{title}</Text>
          {body ? (
            <View className="mt-notice-body-top">
              <Text variant="noticeBody">{body}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {action ? (
        <CardAction action={action} block={Boolean(action.primary) && windowClass === 'compact'} />
      ) : null}
    </View>
  );
}

function NoticeBanner({ title, body, tone = 'info', icon, action, testID }: BannerProps) {
  const attention = tone === 'attention';
  return (
    <View
      role="status"
      testID={testID}
      className={clsx(
        'rounded-well gap-banner-gap px-banner-x py-banner-y flex-row items-center',
        attention ? 'bg-attn-soft' : 'bg-fill'
      )}>
      {icon ? <Icon name={icon} size="small" tone={attention ? 'attn' : 'text'} /> : null}
      <View className="min-w-0 flex-1">
        <Text variant="meta" tone="default">
          {body ? `${title} ${body}` : title}
        </Text>
      </View>
      {action ? (
        <PressableSurface
          a11y={{ label: action.label, role: 'button' }}
          onPress={() => void action.onPress()}
          hitSlop={BANNER_LINK_SLOP}>
          <Text variant="label" tone={attention ? 'attn' : 'default'}>
            {action.label}
          </Text>
        </PressableSurface>
      ) : null}
    </View>
  );
}

export function Notice({ inline, leading, ...notice }: NoticeProps) {
  if (inline) return <NoticeBanner {...notice} />;
  return <NoticeCard {...notice} leading={leading} />;
}
