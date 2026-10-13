import { useState } from 'react';
import { View } from 'react-native';
import type { ShareAccess } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';

export type ShareRow = {
  id: string;
  name: string;
  access: string;
};

export type ShareCandidate = {
  id: string;
  name: string;
};

export type ShareDialogLabels = {
  title: string;
  empty: string;
  addTitle: string;
  addPlaceholder: string;
  addConfirm: string;
  noneLeft: string;
  newAccess: string;
  accessView: string;
  accessEdit: string;
  rowAccess: (name: string) => string;
  removeRow: (name: string) => string;
  close: string;
  search: string;
  noResults: string;
};

type ShareMembersDialogProps<TRow extends ShareRow> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: ShareDialogLabels;
  rows: readonly TRow[];
  isPending: (row: TRow) => boolean;
  candidates: readonly ShareCandidate[];
  onAdd: (userId: string, access: ShareAccess) => void;
  onChangeAccess: (row: TRow, access: ShareAccess) => void;
  onRemove: (row: TRow) => void;
};

export function ShareMembersDialog<TRow extends ShareRow>({
  open,
  onOpenChange,
  labels,
  rows,
  isPending,
  candidates,
  onAdd,
  onChangeAccess,
  onRemove,
}: ShareMembersDialogProps<TRow>) {
  const [candidate, setCandidate] = useState('');
  const [access, setAccess] = useState<ShareAccess>('view');
  const accessOptions = [
    { value: 'view' as const, label: labels.accessView },
    { value: 'edit' as const, label: labels.accessEdit },
  ];
  const chosen = candidates.find((person) => person.id === candidate);

  const add = () => {
    if (!chosen) return;
    const userId = chosen.id;
    setCandidate('');
    onAdd(userId, access);
  };

  return (
    <AdaptiveDialog open={open} onOpenChange={onOpenChange} title={labels.title} closeLabel={labels.close}>
      <View className="gap-4">
        {rows.length === 0 ? (
          <Text variant="caption">{labels.empty}</Text>
        ) : (
          rows.map((row) => (
            <View
              key={row.id}
              className={
                isPending(row)
                  ? 'flex-row flex-wrap items-center gap-3 opacity-60'
                  : 'flex-row flex-wrap items-center gap-3'
              }>
              <Text variant="label" className="min-w-0 flex-1" numberOfLines={1}>
                {row.name}
              </Text>
              <SegmentedControl
                options={accessOptions}
                value={row.access === 'edit' ? 'edit' : 'view'}
                onChange={(next) => {
                  if (!isPending(row)) onChangeAccess(row, next);
                }}
                accessibilityLabel={labels.rowAccess(row.name)}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending(row)}
                accessibilityLabel={labels.removeRow(row.name)}
                onPress={() => onRemove(row)}>
                <Icon name="trash" className="text-muted-foreground size-4" />
              </Button>
            </View>
          ))
        )}

        <View className="border-border-subtle gap-3 border-t pt-4">
          <Text variant="label">{labels.addTitle}</Text>
          {candidates.length === 0 ? (
            <Text variant="caption">{labels.noneLeft}</Text>
          ) : (
            <>
              <AdaptiveSelect
                options={candidates.map((person) => ({ value: person.id, label: person.name }))}
                value={candidate}
                onChange={setCandidate}
                title={labels.addTitle}
                closeLabel={labels.close}
                searchPlaceholder={labels.search}
                emptyLabel={labels.noResults}
                trigger={<SelectField label={chosen?.name} placeholder={labels.addPlaceholder} />}
              />
              <SegmentedControl
                options={accessOptions}
                value={access}
                onChange={setAccess}
                accessibilityLabel={labels.newAccess}
              />
              <Button disabled={!chosen} onPress={add}>
                <Text>{labels.addConfirm}</Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </AdaptiveDialog>
  );
}
