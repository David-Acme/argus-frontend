import { useState } from 'react';
import { View } from 'react-native';
import type { Setting, SettingChange, SettingsOwner } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowLayout } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Confirm } from '@/shared/ui/confirm';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { SettingRow } from '@/features/settings/components/setting-row';
import { SettingSheet } from '@/features/settings/components/setting-sheet';
import { TransferSheet } from '@/features/settings/components/transfer-sheet';
import type { Transfer } from '@/features/settings/components/transfer-sheet';
import { VoiceCards } from '@/features/settings/components/voice-cards';
import { SERVICE_LOOK } from '@/features/settings/constants/services.constant';
import { useVoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { pendingRestartKeys } from '@/features/settings/model/settings-catalog';
import { advancedOf, basicOf, changedOf } from '@/features/settings/model/services';
import { ownerName, settingText, valueText } from '@/features/settings/model/setting-text';
import { usesChoiceList } from '@/features/settings/model/tts-preview';

export type ServiceChange = (owner: SettingsOwner, changes: SettingChange[]) => void;

type ServiceDetailProps = {
  owner: SettingsOwner;
  onChange: ServiceChange;
  onRetry: () => void | Promise<unknown>;
};

type AdvancedProps = { owner: SettingsOwner; onOpen: (setting: Setting) => void };

type HeaderProps = { owner: SettingsOwner; onChange: ServiceChange };

function Advanced({ owner, onOpen }: AdvancedProps) {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const [open, setOpen] = useState(false);
  const settings = advancedOf(owner);
  if (settings.length === 0) return null;
  const rows = settings.map((setting) => (
    <Row
      key={setting.key}
      title={settingText(setting.key).label}
      meta={{ text: setting.key, mono: true }}
      trailing={valueText(setting, setting.value)}
      chevron
      onPress={() => onOpen(setting)}
      testID={`setting-${setting.key}`}
    />
  ));
  if (windowClass !== 'compact')
    return (
      <Section title={t('screens.settings.advanced.title')} meta={String(settings.length)}>
        {rows}
      </Section>
    );
  return (
    <>
      <Section>
        <Row
          title={t('screens.settings.advanced.count', { count: String(settings.length) })}
          trailing={<Icon name={open ? 'minus' : 'plus'} size="small" tone="text-3" />}
          onPress={() => setOpen((shown) => !shown)}
        />
      </Section>
      {open ? <Section>{rows}</Section> : null}
    </>
  );
}

function Header({ owner, onChange }: HeaderProps) {
  const { t } = useTranslation();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [resetting, setResetting] = useState(false);
  const look = SERVICE_LOOK[owner.service];
  const name = ownerName(owner);
  const changed = changedOf(owner);
  const reset = () => {
    onChange(
      owner,
      changed.map((setting) => ({ key: setting.key, value: setting.fallback }))
    );
    setResetting(false);
  };
  return (
    <>
      <View className="flex-row items-center gap-4 pt-2">
        <Avatar icon={look.icon} tone={look.tone} size="large" />
        <View className="min-w-0 flex-1">
          <Text variant="heroSecondary" heading={2}>
            {name}
          </Text>
          <Text variant="meta" tone="2">
            {t(look.hint)}
          </Text>
        </View>
        {owner.reachable ? (
          <Menu
            label={t('screens.settings.more.label')}
            items={[
              {
                label: t('screens.settings.transfer.export'),
                icon: 'download',
                onPress: () => setTransfer({ owner, mode: 'export' }),
              },
              {
                label: t('screens.settings.transfer.import'),
                icon: 'up',
                onPress: () => setTransfer({ owner, mode: 'import' }),
              },
              {
                label: t('screens.settings.more.reset'),
                icon: 'refresh',
                destructive: true,
                onPress: () => setResetting(true),
              },
            ]}
          />
        ) : null}
      </View>
      <TransferSheet transfer={transfer} onApply={onChange} onClose={() => setTransfer(null)} />
      <Confirm
        open={resetting && changed.length > 0}
        variant="destructive"
        title={t('screens.settings.more.reset-title', { name })}
        body={t('screens.settings.more.reset-body', { count: String(changed.length) })}
        confirmLabel={t('screens.settings.more.reset-confirm', { name })}
        onConfirm={reset}
        onCancel={() => setResetting(false)}
      />
      {resetting && changed.length === 0 ? (
        <Section variant="plain">
          <Notice inline icon="check" title={t('screens.settings.more.reset-none', { name })} />
        </Section>
      ) : null}
    </>
  );
}

export function ServiceDetail({ owner, onChange, onRetry }: ServiceDetailProps) {
  const { t } = useTranslation();
  const preview = useVoicePreview();
  const [editing, setEditing] = useState<Setting | null>(null);
  const name = ownerName(owner);
  const basic = basicOf(owner);
  const voices = basic.filter(usesChoiceList);
  const others = basic.filter((setting) => !usesChoiceList(setting));
  const pending = pendingRestartKeys(owner);
  const set = (key: string, value: string) => onChange(owner, [{ key, value }]);
  const current = editing
    ? (owner.settings.find((setting) => setting.key === editing.key) ?? null)
    : null;
  return (
    <View testID={`service-${owner.service}`}>
      <Header owner={owner} onChange={onChange} />
      {!owner.reachable ? (
        <Section variant="plain">
          <Notice
            tone="attention"
            icon="refresh"
            title={t('screens.settings.services.unreachable-title', { name })}
            body={t('screens.settings.services.unreachable-body')}
            action={{ label: t('common.retry'), onPress: onRetry, primary: true }}
          />
        </Section>
      ) : null}
      {pending.length > 0 ? (
        <Section variant="plain">
          <Notice
            inline
            tone="attention"
            icon="refresh"
            title={t('screens.settings.advanced.pending-restart', { name })}
          />
        </Section>
      ) : null}
      {voices.map((setting) => (
        <VoiceCards
          key={setting.key}
          setting={setting}
          siblings={owner.settings}
          preview={preview}
          onChange={(value) => set(setting.key, value)}
        />
      ))}
      {others.length > 0 ? (
        <Section>
          {others.map((setting) => (
            <SettingRow
              key={setting.key}
              setting={setting}
              onChange={(value) => set(setting.key, value)}
              onOpen={() => setEditing(setting)}
            />
          ))}
        </Section>
      ) : null}
      {owner.reachable && basic.length === 0 ? (
        <Section variant="plain">
          <Notice
            icon="check"
            title={t('screens.settings.services.empty')}
            body={t('screens.settings.services.empty-meta')}
          />
        </Section>
      ) : null}
      {owner.reachable ? <Advanced owner={owner} onOpen={setEditing} /> : null}
      <SettingSheet setting={current} onChange={set} onClose={() => setEditing(null)} />
    </View>
  );
}
