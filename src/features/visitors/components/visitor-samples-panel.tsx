import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { VisitorDetail } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { VisitorFace } from '@/features/visitors/components/visitor-face';

type VisitorSamplesPanelProps = {
  visitor: VisitorDetail;
  label: string;
  pending: boolean;
  onSplit: (sampleIds: number[]) => Promise<unknown>;
  onDelete: (sampleId: number) => void;
  className?: string;
};

export function VisitorSamplesPanel({
  visitor,
  label,
  pending,
  onSplit,
  onDelete,
  className,
}: VisitorSamplesPanelProps) {
  const { t } = useTranslation();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const canSplit = selected.length > 0 && selected.length < visitor.samples.length;

  const toggle = (sampleId: number) =>
    setSelected((current) =>
      current.includes(sampleId) ? current.filter((id) => id !== sampleId) : [...current, sampleId]
    );

  const split = async () => {
    await onSplit(selected);
    setSelecting(false);
    setSelected([]);
  };

  return (
    <Panel
      title={t('screens.visitors.samples-title')}
      count={visitor.samples.length}
      description={t('screens.visitors.samples-hint')}
      className={className}
      action={
        visitor.samples.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              setSelecting((current) => !current);
              setSelected([]);
            }}>
            <Text>{selecting ? t('screens.visitors.samples-cancel') : t('screens.visitors.samples-select')}</Text>
          </Button>
        ) : null
      }>
      <View className="flex-row flex-wrap gap-2">
        {visitor.samples.map((sample) => {
          const isSelected = selected.includes(sample.id);
          return (
            <View key={sample.id} className="relative">
              <Pressable
                accessibilityRole={selecting ? 'checkbox' : 'image'}
                accessibilityState={selecting ? { checked: isSelected } : undefined}
                accessibilityLabel={label}
                disabled={!selecting}
                onPress={() => toggle(sample.id)}
                className={cn('rounded-lg', isSelected && 'border-accent border-2')}>
                <VisitorFace
                  visitorId={visitor.id}
                  sampleId={sample.id}
                  hasCrop={sample.hasCrop}
                  category={visitor.category}
                  label={label}
                  className="size-20 rounded-lg"
                />
              </Pressable>
              {selecting ? (
                isSelected ? (
                  <View className="bg-interactive absolute top-1 right-1 size-5 items-center justify-center rounded-full">
                    <Icon name="check" className="text-foreground-on-interactive size-3" />
                  </View>
                ) : null
              ) : visitor.samples.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('screens.visitors.sample-delete-title')}
                  hitSlop={8}
                  onPress={() => onDelete(sample.id)}
                  className="bg-card/90 active:bg-surface-secondary absolute top-1 right-1 size-6 items-center justify-center rounded-full">
                  <Icon name="x" className="text-foreground-secondary size-3.5" />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      {selecting ? (
        <Button
          variant="outline"
          disabled={!canSplit}
          loading={pending}
          onPress={() => void split()}
          className="self-start">
          <Text>{t('screens.visitors.split-action')}</Text>
        </Button>
      ) : null}
    </Panel>
  );
}
