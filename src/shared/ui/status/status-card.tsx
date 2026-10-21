import { View } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Inline } from '@/shared/ui/layout';
import { Text } from '@/shared/ui/text';
import { StatusFade } from './status-fade';
import type { CardStatusProps } from './status-types';

type CardHeadProps = Pick<CardStatusProps, 'sentence' | 'meta' | 'tone'>;

function CardHead({ sentence, meta, tone }: CardHeadProps) {
  if (!sentence) return null;
  return (
    <StatusFade change={sentence}>
      <Text variant="headline" tone={tone === 'alert' ? 'alert' : 'default'} heading={3}>
        {sentence}
      </Text>
      {meta ? <Text variant="meta">{meta}</Text> : null}
    </StatusFade>
  );
}

export function CardStatus({
  tone,
  sentence,
  meta,
  media,
  primary,
  secondaryAction,
  tertiary,
}: CardStatusProps) {
  const { elevation } = useThemeTokens();
  const card = { boxShadow: elevation.float };
  return (
    <View
      role="alert"
      className="rounded-status bg-surface gap-status-card-gap p-status-card-pad mt-status-card-top"
      style={card}>
      <CardHead sentence={sentence} meta={meta} tone={tone} />
      {media}
      <Inline fill>
        <Button variant="primary" block label={primary.label} onPress={primary.onPress} />
        {secondaryAction ? (
          <Button block label={secondaryAction.label} onPress={secondaryAction.onPress} />
        ) : null}
      </Inline>
      {tertiary ? (
        <View className="items-center">
          <Button variant="ghost" compact label={tertiary.label} onPress={tertiary.onPress} />
        </View>
      ) : null}
    </View>
  );
}
