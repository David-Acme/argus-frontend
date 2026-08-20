import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { MEMBER_TINTS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type MemberStackProps = {
  /** Display names; only the initial is rendered. */
  members: readonly string[];
  /** Beyond this, the rest collapse into a "+n" chip. */
  max?: number;
  size?: 'sm' | 'md';
};

function tintFor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return MEMBER_TINTS[hash % MEMBER_TINTS.length];
}

export function MemberStack({ members, max = 4, size = 'sm' }: MemberStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  const box = size === 'sm' ? 'size-6' : 'size-7';
  const label = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <View
      className="flex-row items-center"
      accessibilityRole="text"
      accessibilityLabel={members.join(', ')}>
      {visible.map((member, index) => (
        <View
          key={`${member}-${index}`}
          className={cn(
            'border-card items-center justify-center rounded-full border-2',
            box,
            tintFor(member),
            index > 0 && '-ml-2'
          )}>
          <Text className={cn('text-foreground-secondary font-semibold', label)}>
            {member.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View
          className={cn(
            'bg-surface-secondary border-card -ml-2 items-center justify-center rounded-full border-2',
            box
          )}>
          <Text className={cn('text-muted-foreground font-semibold', label)}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  );
}
