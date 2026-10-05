import { View } from 'react-native';
import type { EnvironmentResponseConfig, MenuOption, RecipientMode, ResponseRecipient } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Panel } from '@/shared/components/ui/panel';
import { SelectField } from '@/shared/components/ui/select-field';
import { Switch } from '@/shared/components/ui/switch';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { silentOf, stepsOf, type MoveDirection } from '@/features/security/model/response-recipients';

type ResponseRecipientsPanelProps = {
  config: EnvironmentResponseConfig | null;
  failed: boolean;
  editable: boolean;
  selfId: number;
  onMode: (userId: number, mode: RecipientMode) => void;
  onMove: (userId: number, direction: MoveDirection) => void;
  onDuty: (userId: number, onDuty: boolean) => void;
  onStepSeconds: (seconds: number) => void;
  className?: string;
};

type RecipientRowProps = {
  recipient: ResponseRecipient;
  editable: boolean;
  dutyEditable: boolean;
  first: boolean;
  last: boolean;
  staffedNow: boolean;
  onMode: (mode: RecipientMode) => void;
  onMove: (direction: MoveDirection) => void;
  onDuty: (onDuty: boolean) => void;
};

const STEP_SECONDS = [30, 45, 60, 90, 120, 180] as const;

function RecipientRow({
  recipient,
  editable,
  dutyEditable,
  first,
  last,
  staffedNow,
  onMode,
  onMove,
  onDuty,
}: RecipientRowProps) {
  const { t } = useTranslation();
  const modes: MenuOption<RecipientMode>[] = [
    { value: 'call', label: t('screens.response.recipients.mode-call'), icon: 'phone' },
    { value: 'notify', label: t('screens.response.recipients.mode-notify'), icon: 'bell' },
    { value: 'off', label: t('screens.response.recipients.mode-off'), icon: 'volume-x' },
  ];
  const modeLabel = t(`screens.response.recipients.mode-${recipient.mode}`);
  const detail = [
    t(`screens.response.recipients.role.${recipient.role}`),
    recipient.mandatory ? t('screens.response.recipients.mandatory') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const isGuard = recipient.role === 'guard';

  return (
    <View className="gap-1.5">
      <View className="min-h-11 flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <Text variant="label" numberOfLines={1}>
            {recipient.name}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {detail}
          </Text>
        </View>
        {editable ? (
          <>
            <AdaptiveSelect
              options={modes}
              value={recipient.mode}
              onChange={onMode}
              title={t('screens.response.recipients.mode-label', { name: recipient.name })}
              closeLabel={t('common.close')}
              searchPlaceholder={modeLabel}
              emptyLabel={modeLabel}
              filterThreshold={modes.length + 1}
              trigger={<SelectField label={recipient.mandatory ? t('screens.response.recipients.mode-call') : modeLabel} />}
            />
            {recipient.mode !== 'off' ? (
              <View className="flex-row">
                <IconButton
                  icon="chevron-up"
                  label={t('screens.response.recipients.move-up', { name: recipient.name })}
                  disabled={first}
                  onPress={() => onMove('earlier')}
                />
                <IconButton
                  icon="chevron-down"
                  label={t('screens.response.recipients.move-down', { name: recipient.name })}
                  disabled={last}
                  onPress={() => onMove('later')}
                />
              </View>
            ) : null}
          </>
        ) : (
          <Text variant="caption" className="text-foreground-secondary">
            {recipient.mandatory ? t('screens.response.recipients.mode-call') : modeLabel}
          </Text>
        )}
      </View>
      {isGuard && recipient.mode !== 'off' ? (
        <View className="bg-surface-secondary min-h-11 flex-row items-center gap-3 rounded-2xl px-3 py-1.5">
          <View className="min-w-0 flex-1">
            <Text variant="label">
              {staffedNow && !recipient.onDuty
                ? t('screens.response.recipients.duty-staffed')
                : t('screens.response.recipients.on-duty')}
            </Text>
            <Text variant="caption">{t('screens.response.recipients.on-duty-hint')}</Text>
          </View>
          <Switch
            value={recipient.onDuty || staffedNow}
            disabled={!dutyEditable || staffedNow}
            accessibilityLabel={t('screens.response.recipients.on-duty')}
            onChange={onDuty}
          />
        </View>
      ) : null}
    </View>
  );
}

export function ResponseRecipientsPanel({
  config,
  failed,
  editable,
  selfId,
  onMode,
  onMove,
  onDuty,
  onStepSeconds,
  className,
}: ResponseRecipientsPanelProps) {
  const { t } = useTranslation();
  const steps = config ? stepsOf(config.recipients) : [];
  const silent = config ? silentOf(config.recipients) : [];
  const flat = steps.flatMap((group) => group.recipients);
  const waitOptions: MenuOption<string>[] = STEP_SECONDS.map((seconds) => ({
    value: String(seconds),
    label: t('screens.response.recipients.step-wait-value', { seconds: String(seconds) }),
  }));
  const waitLabel = config
    ? t('screens.response.recipients.step-wait-value', { seconds: String(config.stepSeconds) })
    : '';

  const row = (recipient: ResponseRecipient) => (
    <RecipientRow
      key={recipient.userId}
      recipient={recipient}
      editable={editable}
      dutyEditable={editable || recipient.userId === selfId}
      first={flat[0]?.userId === recipient.userId && (steps[0]?.recipients.length ?? 0) === 1}
      last={flat.at(-1)?.userId === recipient.userId && (steps.at(-1)?.recipients.length ?? 0) === 1}
      staffedNow={config?.staffedNow ?? false}
      onMode={(mode) => onMode(recipient.userId, mode)}
      onMove={(direction) => onMove(recipient.userId, direction)}
      onDuty={(value) => onDuty(recipient.userId, value)}
    />
  );

  return (
    <Panel
      title={t('screens.response.recipients.title')}
      description={
        editable ? t('screens.response.recipients.description') : t('screens.response.recipients.own-description')
      }
      className={className}>
      {failed && !config ? (
        <Text variant="caption">{t('screens.response.recipients.load-error')}</Text>
      ) : !config ? (
        <View className="bg-surface-secondary h-24 rounded-2xl" />
      ) : config.recipients.length === 0 ? (
        <Text variant="caption">{t('screens.response.recipients.nobody-own')}</Text>
      ) : (
        <View className="gap-4">
          {steps.map((group, index) => (
            <View key={group.step} className={cn('gap-2', index > 0 && 'border-divider border-t pt-3')}>
              <Text variant="micro">
                {index === 0
                  ? t('screens.response.recipients.step-first')
                  : t('screens.response.recipients.step-next', { step: String(index + 1) })}
              </Text>
              {group.recipients.map(row)}
            </View>
          ))}
          {editable && config.contacts.length > 0 ? (
            <View className="border-divider gap-1 border-t pt-3">
              <Text variant="micro">{t('screens.response.recipients.step-last')}</Text>
              <Text variant="caption">{config.contacts.map((contact) => contact.name).join(', ')}</Text>
            </View>
          ) : null}
          {silent.length > 0 ? (
            <View className="border-divider gap-2 border-t pt-3">
              <Text variant="micro">{t('screens.response.recipients.mode-off')}</Text>
              {silent.map(row)}
            </View>
          ) : null}
          {editable ? (
            <View className="border-divider min-h-11 flex-row items-center gap-3 border-t pt-3">
              <Text variant="label" className="flex-1">
                {t('screens.response.recipients.step-wait')}
              </Text>
              <AdaptiveSelect
                options={waitOptions}
                value={String(config.stepSeconds)}
                onChange={(value) => onStepSeconds(Number(value))}
                title={t('screens.response.recipients.step-wait')}
                closeLabel={t('common.close')}
                searchPlaceholder={waitLabel}
                emptyLabel={waitLabel}
                filterThreshold={waitOptions.length + 1}
                trigger={<SelectField label={waitLabel} />}
              />
            </View>
          ) : null}
        </View>
      )}
    </Panel>
  );
}
