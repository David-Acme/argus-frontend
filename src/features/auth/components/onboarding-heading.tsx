import { View } from 'react-native';
import { size } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';

export type HeadingMark = 'estela' | { icon: IconGlyph; alert?: boolean };

export type OnboardingHeadingProps = {
  title: string;
  lead?: string;
  mark?: HeadingMark;
};

type MarkProps = { mark: HeadingMark };

function Mark({ mark }: MarkProps) {
  if (mark === 'estela') return <Presence state="idle" size={size.presenceMark} />;
  return <Avatar icon={mark.icon} tone={mark.alert ? 'alert' : 'default'} size="large" />;
}

export function OnboardingHeading({ title, lead, mark }: OnboardingHeadingProps) {
  return (
    <View className="mt-2 gap-2">
      <View className="flex-row items-center gap-3">
        {mark ? <Mark mark={mark} /> : null}
        <View className="min-w-0 flex-1">
          <Text variant="heroSecondary" heading={1}>
            {title}
          </Text>
        </View>
      </View>
      {lead ? (
        <Text variant="body" tone="2">
          {lead}
        </Text>
      ) : null}
    </View>
  );
}
