import { useState } from 'react';
import { View } from 'react-native';
import type { SettingChange, SettingsOwner } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { exportText, planImport, type ImportPlan } from '@/features/settings/model/settings-catalog';
import { ownerName, settingText, valueText } from '@/features/settings/model/setting-text';

export type TransferMode = 'export' | 'import';

type SettingsTransferDialogProps = {
  owner: SettingsOwner | null;
  mode: TransferMode;
  onApply: (owner: SettingsOwner, changes: SettingChange[]) => void;
  onClose: () => void;
};

type ImportPreviewProps = {
  owner: SettingsOwner;
  plan: ImportPlan;
};

const PREVIEW_LIMIT = 8;

function clipboardAvailable(): boolean {
  return IS_WEB && typeof navigator !== 'undefined' && navigator.clipboard != null;
}

function ImportPreview({ owner, plan }: ImportPreviewProps) {
  const { t } = useTranslation();
  if (!plan.ok)
    return (
      <View className="bg-surface-secondary flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3">
        <Icon name="triangle-alert" className="text-warning-strong mt-0.5 size-4" />
        <Text variant="caption" className="min-w-0 flex-1">
          {plan.reason === 'wrongService'
            ? t('screens.settings.transfer.refusal.wrongService', {
                service: plan.service ?? '',
                owner: ownerName(owner),
              })
            : t(`screens.settings.transfer.refusal.${plan.reason}`)}
        </Text>
      </View>
    );
  const listed = plan.changes.slice(0, PREVIEW_LIMIT);
  return (
    <View className="bg-surface-secondary gap-2 rounded-2xl px-3.5 py-3">
      <Text variant="label">
        {plan.changes.length === 1
          ? t('screens.settings.transfer.changes-one')
          : t('screens.settings.transfer.changes-other', { count: String(plan.changes.length) })}
      </Text>
      {listed.map((change) => {
        const setting = owner.settings.find((candidate) => candidate.key === change.key);
        if (!setting) return null;
        return (
          <View key={change.key} className="flex-row flex-wrap items-baseline justify-between gap-x-3">
            <Text variant="caption" className="text-foreground min-w-0 flex-1" numberOfLines={1}>
              {settingText(change.key).label}
            </Text>
            <Text variant="caption" className="tabular-nums">
              {`${valueText(setting, setting.value)} → ${valueText(setting, change.value)}`}
            </Text>
          </View>
        );
      })}
      {plan.changes.length > listed.length ? (
        <Text variant="micro">{t('screens.settings.profiles.result.more', { count: String(plan.changes.length - listed.length) })}</Text>
      ) : null}
      {plan.unchanged > 0 ? (
        <Text variant="micro">{t('screens.settings.transfer.unchanged', { count: String(plan.unchanged) })}</Text>
      ) : null}
      {plan.unknown.length > 0 ? (
        <Text variant="micro">{t('screens.settings.transfer.unknown', { keys: plan.unknown.join(', ') })}</Text>
      ) : null}
    </View>
  );
}

export function SettingsTransferDialog({ owner, mode, onApply, onClose }: SettingsTransferDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [exported] = useState(() => (owner ? exportText(owner, new Date()) : ''));
  const plan = owner && draft.trim() !== '' ? planImport(draft, owner) : null;
  const name = owner ? ownerName(owner) : '';

  const copy = () => {
    if (!clipboardAvailable()) return;
    void navigator.clipboard.writeText(exported).then(() => setCopied(true));
  };

  const apply = () => {
    if (!owner || !plan?.ok) return;
    onApply(owner, plan.changes);
    onClose();
  };

  return (
    <AdaptiveDialog
      open={owner !== null}
      onOpenChange={(open) => !open && onClose()}
      title={
        mode === 'export'
          ? t('screens.settings.transfer.export-title', { name })
          : t('screens.settings.transfer.import-title', { name })
      }
      description={
        mode === 'export' ? t('screens.settings.transfer.export-hint') : t('screens.settings.transfer.import-hint')
      }
      closeLabel={t('common.close')}
      size="wide"
      onSubmit={mode === 'import' ? apply : undefined}
      footer={
        mode === 'export' ? (
          <>
            <Button variant="outline" onPress={onClose}>
              <Text>{t('common.close')}</Text>
            </Button>
            {clipboardAvailable() ? (
              <Button onPress={copy}>
                <Icon name={copied ? 'check' : 'copy'} className="text-foreground-on-interactive size-4" />
                <Text>{copied ? t('screens.settings.transfer.copied') : t('screens.settings.transfer.copy')}</Text>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button variant="outline" onPress={onClose}>
              <Text>{t('screens.settings.profiles.preview.cancel')}</Text>
            </Button>
            <Button disabled={!plan?.ok} onPress={apply}>
              <Text>{t('screens.settings.transfer.apply')}</Text>
            </Button>
          </>
        )
      }>
      {mode === 'export' ? (
        <Textarea value={exported} editable={false} selectTextOnFocus className="min-h-64 font-mono opacity-100" />
      ) : (
        <View className="gap-3">
          <Textarea
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('screens.settings.transfer.placeholder')}
            accessibilityLabel={t('screens.settings.transfer.import-title', { name })}
            className="min-h-48 font-mono"
          />
          {owner && plan ? <ImportPreview owner={owner} plan={plan} /> : null}
        </View>
      )}
    </AdaptiveDialog>
  );
}
