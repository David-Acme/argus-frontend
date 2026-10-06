import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import type { UninstallTarget } from '@/features/modules/hooks/use-module-uninstall';
import { dataSummary, purgeReady } from '@/features/modules/model/module-lifecycle';

type UninstallDialogProps = {
  target: UninstallTarget | null;
  onClose: () => void;
  onSubmit: (keepData: boolean) => void;
};

type ChoiceProps = {
  selected: boolean;
  title: string;
  hint: string;
  danger?: boolean;
  onPress: () => void;
};

function Choice({ selected, title, hint, danger = false, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      className={cn(
        'bg-surface-secondary dark:bg-card-secondary flex-row items-start gap-3 rounded-2xl border-2 p-3',
        selected ? (danger ? 'border-error' : 'border-accent') : 'border-transparent'
      )}>
      <View
        className={cn(
          'mt-0.5 size-5 items-center justify-center rounded-full border-2',
          selected ? (danger ? 'border-error' : 'border-accent') : 'border-border'
        )}>
        {selected ? <View className={cn('size-2.5 rounded-full', danger ? 'bg-error' : 'bg-accent')} /> : null}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" className={danger && selected ? 'text-error-strong' : undefined}>
          {title}
        </Text>
        <Text variant="caption">{hint}</Text>
      </View>
    </Pressable>
  );
}

export function UninstallDialog({ target, onClose, onSubmit }: UninstallDialogProps) {
  const { t, language } = useTranslation();
  const erase = target?.mode === 'erase';
  const [purge, setPurge] = useState(erase);
  const [typed, setTyped] = useState('');
  const module = target?.module ?? null;
  const name = module?.name || module?.id || '';
  const summary = target?.owners ? dataSummary(target.owners, language, t) : [];
  const purging = erase || purge;
  const ready = !purging || purgeReady({ typed, name });

  const finish = (submit: boolean) => {
    if (submit && !ready) return;
    setPurge(false);
    setTyped('');
    if (submit) onSubmit(!purging);
    else onClose();
  };

  return (
    <AdaptiveDialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) finish(false);
      }}
      title={
        erase ? t('screens.modules.uninstall.erase-title', { name }) : t('screens.modules.uninstall.data-title', { name })
      }
      description={
        erase ? t('screens.modules.uninstall.erase-description') : t('screens.modules.uninstall.data-description')
      }
      closeLabel={t('common.cancel')}
      onSubmit={() => finish(true)}
      footer={
        <View className="flex-row justify-end gap-2">
          <Button variant="ghost" onPress={() => finish(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button variant={purging ? 'destructive' : 'default'} disabled={!ready} onPress={() => finish(true)}>
            <Text>{purging ? t('screens.modules.uninstall.confirm-purge') : t('screens.modules.uninstall.confirm')}</Text>
          </Button>
        </View>
      }>
      <View className="gap-4">
        <View className="bg-surface-secondary dark:bg-card-secondary gap-1.5 rounded-2xl p-3">
          <Text variant="caption" className="text-foreground-secondary">
            {target?.owners ? t('screens.modules.uninstall.holds') : t('screens.modules.uninstall.data-unknown')}
          </Text>
          {target?.owners?.some((owner) => !owner.reachable || !owner.reported) ? (
            <Text variant="caption">{t('screens.modules.uninstall.data-unknown')}</Text>
          ) : null}
          {summary.map((line) => (
            <View key={line} className="flex-row items-center gap-2">
              <Icon name="hard-drive" className="text-muted-foreground size-3.5" />
              <Text variant="label" className="tabular-nums">
                {line}
              </Text>
            </View>
          ))}
          <View className="flex-row items-start gap-2 pt-1">
            <Icon name="shield-check" className="text-muted-foreground mt-0.5 size-3.5" />
            <Text variant="caption" className="min-w-0 flex-1">
              {t('screens.modules.data.kept')}
            </Text>
          </View>
        </View>

        {erase ? null : (
          <View accessibilityRole="radiogroup" className="gap-2">
            <Choice
              selected={!purge}
              title={t('screens.modules.uninstall.keep')}
              hint={t('screens.modules.uninstall.keep-hint')}
              onPress={() => setPurge(false)}
            />
            <Choice
              selected={purge}
              danger
              title={t('screens.modules.uninstall.purge')}
              hint={t('screens.modules.uninstall.purge-hint')}
              onPress={() => setPurge(true)}
            />
          </View>
        )}

        {purging ? (
          <View className="gap-2">
            <View className="flex-row items-start gap-2">
              <Icon name="triangle-alert" className="text-error-strong mt-0.5 size-4" />
              <Text variant="caption" className="text-error-strong min-w-0 flex-1">
                {t('screens.modules.uninstall.purge-warning')}
              </Text>
            </View>
            <Text variant="label">{t('screens.modules.uninstall.type-name', { name })}</Text>
            <Input
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              accessibilityLabel={t('screens.modules.uninstall.type-name', { name })}
              placeholder={name}
            />
            <Text variant="caption">{t('screens.modules.uninstall.pin-needed')}</Text>
          </View>
        ) : null}
      </View>
    </AdaptiveDialog>
  );
}
