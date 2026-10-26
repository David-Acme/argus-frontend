import { useState } from 'react';
import { Share, View } from 'react-native';
import type { SettingChange, SettingsOwner } from '@/core/types';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Field } from '@/shared/ui/field';
import { Notice } from '@/shared/ui/notice';
import { Sheet } from '@/shared/ui/sheet';
import { exportText, planImport } from '@/features/settings/model/settings-catalog';
import type { ImportPlan } from '@/features/settings/model/settings-catalog';
import { ownerName } from '@/features/settings/model/setting-text';

export type TransferMode = 'export' | 'import';

export type Transfer = { owner: SettingsOwner; mode: TransferMode };

type TransferSheetProps = {
  transfer: Transfer | null;
  onApply: (owner: SettingsOwner, changes: SettingChange[]) => void;
  onClose: () => void;
};

type PlanProps = { owner: SettingsOwner; plan: ImportPlan };

type OpenProps = { transfer: Transfer } & Omit<TransferSheetProps, 'transfer'>;

const REFUSAL = {
  notJson: 'screens.settings.transfer.refusal.notJson',
  wrongFormat: 'screens.settings.transfer.refusal.wrongFormat',
  wrongService: 'screens.settings.transfer.refusal.wrongService',
  nothingToChange: 'screens.settings.transfer.refusal.nothingToChange',
  tooMany: 'screens.settings.transfer.refusal.tooMany',
} as const;

const clipboard = (): Clipboard | null =>
  IS_WEB && typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;

function PlanNotice({ owner, plan }: PlanProps) {
  const { t } = useTranslation();
  if (!plan.ok)
    return (
      <Notice
        tone="attention"
        icon="alert"
        title={
          plan.reason === 'wrongService'
            ? t('screens.settings.transfer.refusal.wrongService', {
                service: plan.service ?? '',
                owner: ownerName(owner),
              })
            : t(REFUSAL[plan.reason])
        }
      />
    );
  const title =
    plan.changes.length === 1
      ? t('screens.settings.transfer.changes-one')
      : t('screens.settings.transfer.changes-other', { count: String(plan.changes.length) });
  const body =
    plan.unchanged > 0
      ? t('screens.settings.transfer.unchanged', { count: String(plan.unchanged) })
      : undefined;
  return <Notice icon="check" title={title} body={body} />;
}

function OpenTransfer({ transfer, onApply, onClose }: OpenProps) {
  const { t } = useTranslation();
  const { owner, mode } = transfer;
  const [exported] = useState(() => exportText(owner, new Date()));
  const [draft, setDraft] = useState('');
  const plan = draft.trim() === '' ? null : planImport(draft, owner);
  const name = ownerName(owner);

  const send = async () => {
    const board = clipboard();
    if (board) await board.writeText(exported);
    else await Share.share({ message: exported });
    onClose();
  };

  const apply = () => {
    if (!plan?.ok) return;
    onApply(owner, plan.changes);
    onClose();
  };

  const exporting = mode === 'export';
  return (
    <Sheet
      open
      long
      variant="form"
      title={
        exporting
          ? t('screens.settings.transfer.export-title', { name })
          : t('screens.settings.transfer.import-title', { name })
      }
      onClose={onClose}
      dirty={!exporting && draft.trim() !== ''}
      actions={{
        primary: exporting
          ? {
              label: t(
                clipboard() ? 'screens.settings.transfer.copy' : 'screens.settings.transfer.share'
              ),
              onPress: send,
            }
          : { label: t('screens.settings.transfer.apply'), onPress: apply, disabled: !plan?.ok },
      }}>
      <View className="gap-4">
        <Field
          kind="multiline"
          label={
            exporting
              ? t('screens.settings.transfer.export-hint')
              : t('screens.settings.transfer.import-hint')
          }
          placeholder={exporting ? undefined : t('screens.settings.transfer.placeholder')}
          value={exporting ? exported : draft}
          onChangeText={exporting ? () => undefined : setDraft}
        />
        {plan ? <PlanNotice owner={owner} plan={plan} /> : null}
      </View>
    </Sheet>
  );
}

export function TransferSheet({ transfer, onApply, onClose }: TransferSheetProps) {
  if (!transfer) return null;
  return (
    <OpenTransfer
      key={`${transfer.mode}:${transfer.owner.service}`}
      transfer={transfer}
      onApply={onApply}
      onClose={onClose}
    />
  );
}
