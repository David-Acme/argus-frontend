import { clsx } from 'clsx';
import { useContext } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/shared/ui/avatar';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { RowPosition } from '@/shared/ui/row';
import { Text } from '@/shared/ui/text';
import { usePersonWords } from '@/features/people/hooks/use-person-words';
import type { PersonLine } from '@/features/people/model/people';

export type PersonRowProps = {
  person: PersonLine;
  selected: boolean;
  onOpen: (id: string) => void;
};

const FRAME = 'min-h-row flex-row items-center gap-row-gap px-row-x py-row-y web:hover:bg-fill';

export function PersonRow({ person, selected, onOpen }: PersonRowProps) {
  const { index } = useContext(RowPosition);
  const { titleOf, metaOf } = usePersonWords();
  const title = titleOf(person);
  const meta = metaOf(person);
  return (
    <PressableSurface
      a11y={{ label: `${title}, ${meta}`, role: 'button', selected }}
      onPress={() => onOpen(person.id)}
      pressed={{ fill: true }}
      testID={`person-row-${person.id}`}
      className={clsx(FRAME, selected && 'bg-fill')}>
      {index > 0 ? (
        <View className="right-row-x left-row-x border-line absolute top-0 border-t" />
      ) : null}
      <Avatar round initial={person.initial} tone={person.self ? 'accent' : 'default'} />
      <View className={clsx('min-w-0 flex-1', !person.active && 'opacity-60')}>
        <Text variant="rowTitle">{title}</Text>
        <View className="mt-row-meta-gap">
          <Text variant="rowMeta">{meta}</Text>
        </View>
      </View>
      <Icon name="chev" size="small" tone="text-3" />
    </PressableSurface>
  );
}
