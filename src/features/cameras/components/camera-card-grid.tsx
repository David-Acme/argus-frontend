import type { ICameraCacheRow } from '@/core/interfaces';
import { CameraCard } from '@/features/cameras/components/camera-card';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';

type CameraCardGridProps = {
  items: readonly ICameraCacheRow[];
  isPending?: (item: ICameraCacheRow) => boolean;
  onSelect: (id: string) => void;
  createLabel: string;
  createHint: string;
  onCreate?: () => void;
};

export function cameraColumnsFor(width: number): number {
  if (width >= 1180) return 4;
  if (width >= 840) return 3;
  if (width >= 520) return 2;
  return 1;
}

export function CameraCardGrid({
  items,
  isPending,
  onSelect,
  createLabel,
  createHint,
  onCreate,
}: CameraCardGridProps) {
  const slots = items.length + (onCreate ? 1 : 0);
  return (
    <ResponsiveGrid
      id="cameras"
      items={items}
      keyOf={(item) => item.id}
      renderItem={(item) => <CameraCard item={item} pending={isPending?.(item) ?? false} onPress={onSelect} />}
      columnsFor={(width, count) => Math.min(cameraColumnsFor(width), Math.max(1, slots), Math.max(2, count))}
      gap={16}
      trailing={
        onCreate
          ? (width) => <CreateTile label={createLabel} hint={createHint} style={{ width }} onPress={onCreate} />
          : undefined
      }
    />
  );
}
