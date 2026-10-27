import { clsx } from 'clsx';
import { View } from 'react-native';
import { inset, useThemeTokens } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Check } from '@/shared/ui/check';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { ModuleStepCard } from '@/features/modules';
import { moduleGlyphOf } from '@/features/auth/model/module-glyph';

export type ModuleChoiceCardProps = { card: ModuleStepCard; onToggle: (id: string) => void };

const RING = { borderWidth: inset.control.checkBorder };

export function ModuleChoiceCard({ card, onToggle }: ModuleChoiceCardProps) {
  const { elevation } = useThemeTokens();
  return (
    <PressableSurface
      a11y={{ label: card.name, role: 'checkbox', checked: card.selected }}
      onPress={() => onToggle(card.id)}
      haptic="selection"
      disabled={!card.selectable}
      className={clsx(
        'rounded-card bg-surface flex-row items-start gap-3 p-4',
        card.selected ? 'border-ink' : 'border-transparent'
      )}
      style={[RING, { boxShadow: elevation.card }]}>
      <Avatar icon={moduleGlyphOf(card.id)} />
      <View className="min-w-0 flex-1 gap-1">
        <Text variant="headline">{card.name}</Text>
        {card.summary ? (
          <Text variant="meta" tone="2">
            {card.summary}
          </Text>
        ) : null}
        <Text variant="caption" tone="3">
          {card.note}
        </Text>
      </View>
      <View aria-hidden>
        <Check state={card.selected ? 'done' : 'open'} label={card.name} />
      </View>
    </PressableSurface>
  );
}
