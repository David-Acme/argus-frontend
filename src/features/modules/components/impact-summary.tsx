import { View } from 'react-native';
import type { ModuleImpact } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Icon } from '@/shared/components/ui/icon';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import {
  holderName,
  impactIsPartial,
  invitationsOf,
  keepsRunningOf,
  needsReassign,
  stopText,
  type ReassignChoices,
} from '@/features/modules/model/module-impact';
import { formatBytes } from '@/features/modules/model/module-text';

type ImpactSummaryProps = {
  impact: ModuleImpact;
  moduleName: string;
  uninstall: boolean;
  choices: ReassignChoices;
  onChoose: (userId: number, role: string) => void;
};

export function ImpactSummary({ impact, moduleName, uninstall, choices, onChoose }: ImpactSummaryProps) {
  const { t, language } = useTranslation();
  const roleLabel = (role: string) => roleLabelOf(role, t);
  const invitations = invitationsOf(impact.invitations);
  const keepsRunning = keepsRunningOf(impact, language);
  const reassign = needsReassign(impact);
  const options = impact.reassignRoles.map((role) => ({ value: role, label: roleLabel(role) }));

  return (
    <View className="gap-4">
      {impactIsPartial(impact) ? (
        <View accessibilityRole="alert" className="bg-warning/15 flex-row items-start gap-2 rounded-2xl p-3">
          <Icon name="triangle-alert" className="text-warning-strong mt-0.5 size-4" />
          <Text variant="caption" className="min-w-0 flex-1">
            {t('screens.modules.impact.partial')}
          </Text>
        </View>
      ) : null}

      <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
        <Text variant="label">{t('screens.modules.impact.stops-title')}</Text>
        {impact.stops.length === 0 ? (
          <Text variant="caption">{t('screens.modules.impact.nothing-stops')}</Text>
        ) : (
          impact.stops.map((stop) => (
            <View key={stop.kind} className="flex-row items-start gap-2">
              <Icon name="pause" className="text-muted-foreground mt-0.5 size-3.5" />
              <Text variant="caption" className="min-w-0 flex-1">
                {stopText(stop, moduleName, t)}
              </Text>
            </View>
          ))
        )}
      </View>

      {keepsRunning.length > 0 ? (
        <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
          <Text variant="label">{t('screens.modules.impact.keeps-running-title')}</Text>
          {keepsRunning.map((line) => (
            <View key={line.id} className="flex-row items-start gap-2">
              <Icon name="shield-check" className="text-accent-strong mt-0.5 size-3.5" />
              <Text variant="caption" className="min-w-0 flex-1">
                {line.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {impact.roleHolders.length > 0 ? (
        <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
          <Text variant="label">{t('screens.modules.impact.holders-title')}</Text>
          {reassign ? (
            <>
              <Text variant="caption">{t('screens.modules.impact.reassign-title')}</Text>
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.modules.impact.reassign-hint')}
              </Text>
              {impact.roleHolders.map((holder) => {
                const chosen = choices[String(holder.userId)];
                return (
                  <View key={holder.userId} className="gap-1">
                    <Text variant="label" numberOfLines={1}>
                      {`${holderName(holder)} · ${roleLabel(holder.role)}`}
                    </Text>
                    <AdaptiveSelect
                      options={options}
                      value={chosen}
                      onChange={(role) => onChoose(holder.userId, role)}
                      title={holderName(holder)}
                      closeLabel={t('common.close')}
                      searchPlaceholder={t('common.search')}
                      emptyLabel={t('screens.users.no-results')}
                      trigger={
                        <SelectField
                          label={options.find((option) => option.value === chosen)?.label}
                          placeholder={t('screens.modules.impact.reassign-pick')}
                        />
                      }
                    />
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {impact.roleHolders.map((holder) => (
                <View key={holder.userId} className="flex-row items-center gap-2">
                  <Icon name="users" className="text-muted-foreground size-3.5" />
                  <Text variant="caption" className="min-w-0 flex-1" numberOfLines={1}>
                    {`${holderName(holder)} · ${roleLabel(holder.role)}`}
                  </Text>
                </View>
              ))}
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.modules.impact.holders-inactive', { module: moduleName })}
              </Text>
            </>
          )}
        </View>
      ) : null}

      {invitations.count > 0 ? (
        <View className="bg-surface-secondary dark:bg-card-secondary gap-1.5 rounded-2xl p-3">
          <Text variant="label">{t('screens.modules.impact.invitations-title')}</Text>
          <Text variant="caption">
            {invitations.count === 1
              ? t('screens.modules.impact.invitations-revoked-one', {
                  roles: invitations.roles.map(roleLabel).join(', '),
                })
              : t('screens.modules.impact.invitations-revoked', {
                  count: String(invitations.count),
                  roles: invitations.roles.map(roleLabel).join(', '),
                })}
          </Text>
          {invitations.inviters.length > 0 ? (
            <Text variant="caption" className="text-foreground-secondary">
              {t('screens.modules.impact.invitations-by', { names: invitations.inviters.join(', ') })}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row items-start gap-2 px-1">
        <Icon name="shield-check" className="text-muted-foreground mt-0.5 size-3.5" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="caption">{t('screens.modules.impact.data-kept')}</Text>
          {uninstall ? (
            impact.filesBytes > 0 ? (
              <Text variant="caption">
                {t('screens.modules.impact.files-freed', { size: formatBytes(impact.filesBytes, language) })}
              </Text>
            ) : null
          ) : (
            <Text variant="caption">{t('screens.modules.impact.data-kept-restore')}</Text>
          )}
        </View>
      </View>
    </View>
  );
}
