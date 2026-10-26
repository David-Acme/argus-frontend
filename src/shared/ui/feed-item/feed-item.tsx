import { clsx } from 'clsx';
import { Children, createContext, useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';

export type FeedProps = { children: ReactNode; testID?: string };

export type FeedItemProps = {
  who: string;
  when: string;
  text: string;
  leading: ReactNode;
  actions?: ReactNode;
  unreadLabel?: string;
  thread?: boolean;
  onPress?: () => void;
  testID?: string;
};

type FeedWordsProps = Pick<FeedItemProps, 'who' | 'when' | 'text'>;

type UnreadDotProps = { label: string };

const FeedPosition = createContext({ index: 0 });

export function Feed({ children, testID }: FeedProps) {
  const { elevation } = useThemeTokens();
  const column = useInScreenColumn();
  const card = { boxShadow: elevation.card };
  return (
    <View
      role="list"
      testID={testID}
      className={clsx('rounded-card bg-surface px-feed-x py-feed-y', column && 'grow')}
      style={card}>
      {Children.toArray(children).map((child, index) => (
        <FeedPosition.Provider key={index} value={{ index }}>
          {child}
        </FeedPosition.Provider>
      ))}
    </View>
  );
}

function UnreadDot({ label }: UnreadDotProps) {
  return (
    <View
      role="img"
      aria-label={label}
      className="right-unread-end top-unread-top size-dot bg-accent absolute rounded-full"
    />
  );
}

function FeedWords({ who, when, text }: FeedWordsProps) {
  return (
    <>
      <View className="gap-feed-who-gap flex-row items-baseline">
        <View className="min-w-0 shrink">
          <Text variant="feedWho">{who}</Text>
        </View>
        <Text variant="meta" tone="3">
          {when}
        </Text>
      </View>
      <View className="mt-feed-text-top">
        <Text variant="feed">{text}</Text>
      </View>
    </>
  );
}

export function FeedItem({
  who,
  when,
  text,
  leading,
  actions,
  unreadLabel,
  thread,
  onPress,
  testID,
}: FeedItemProps) {
  const { index } = useContext(FeedPosition);
  return (
    <View
      role="listitem"
      testID={testID}
      className={
        index > 0
          ? 'gap-feed-gap py-feed-item-y border-line relative flex-row border-t'
          : 'gap-feed-gap py-feed-item-y relative flex-row'
      }>
      <View className="w-feed-leading items-center">
        {leading}
        {thread ? (
          <View className="mt-thread-top w-thread min-h-thread-min bg-line flex-1 rounded-full" />
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        {onPress ? (
          <PressableSurface
            a11y={{
              label: [unreadLabel, who, when, text].filter(Boolean).join(', '),
              role: 'button',
            }}
            onPress={onPress}
            pressed={{ scale: 'surface' }}>
            <FeedWords who={who} when={when} text={text} />
          </PressableSurface>
        ) : (
          <FeedWords who={who} when={when} text={text} />
        )}
        {actions ? (
          <View className="mt-feed-actions-top gap-feed-actions-gap flex-row flex-wrap">
            {actions}
          </View>
        ) : null}
      </View>
      {unreadLabel ? <UnreadDot label={unreadLabel} /> : null}
    </View>
  );
}
