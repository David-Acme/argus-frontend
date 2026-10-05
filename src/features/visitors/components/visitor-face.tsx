import { Image, View } from 'react-native';
import type { VisitorCategory } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { cn } from '@/shared/libs/utils';
import { VISITOR_CATEGORY_ICONS } from '@/features/visitors/constants';
import { useVisitorCrop } from '@/features/visitors/hooks/use-visitor-crop';

type VisitorFaceProps = {
  visitorId: number;
  sampleId?: number | null;
  hasCrop: boolean;
  category: VisitorCategory;
  label: string;
  className?: string;
};

export function VisitorFace({ visitorId, sampleId, hasCrop, category, label, className }: VisitorFaceProps) {
  const { uri } = useVisitorCrop({ visitorId, sampleId, enabled: hasCrop });

  return (
    <View
      className={cn(
        'bg-surface-secondary items-center justify-center overflow-hidden',
        category === 'watchlist' && 'border-error border-2',
        className
      )}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={label}
          resizeMode="cover"
          className="size-full"
        />
      ) : (
        <Icon name={VISITOR_CATEGORY_ICONS[category]} className="text-muted-foreground size-7" />
      )}
    </View>
  );
}
