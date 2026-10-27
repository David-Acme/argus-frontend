import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import {
  GUARD_MODE_KEYS,
  MODE_ICONS,
  MODULE_NAME_KEYS,
  SCREEN_NAME_KEYS,
} from '@/features/voice/constants/result.constant';
import type { ResultActions } from '@/features/voice/hooks/use-result-actions';
import type { GuardModeResult, ScreenResult } from '@/features/voice/model/argus-result';
import {
  ResultActionsRow,
  ResultHead,
  ResultShell,
} from '@/features/voice/components/results/result-shell';

export type HomeCardProps<R> = { result: R; actions: ResultActions };

export function GuardModeCard({ result, actions }: HomeCardProps<GuardModeResult>) {
  const { t } = useTranslation();
  const title = t('screens.voice.results.mode-title', { mode: t(GUARD_MODE_KEYS[result.mode]) });
  const previous = result.previousMode ? t(GUARD_MODE_KEYS[result.previousMode]) : null;
  const meta =
    previous === null
      ? (result.environmentName ?? undefined)
      : result.environmentName
        ? t('screens.voice.results.mode-was', { place: result.environmentName, mode: previous })
        : t('screens.voice.results.mode-was-plain', { mode: previous });
  const { openSecurity, undoMode } = actions;
  return (
    <ResultShell surface={actions.surface} label={title}>
      <ResultHead icon={MODE_ICONS[result.mode]} tone="ok" title={title} meta={meta} />
      {openSecurity || (undoMode && result.previousMode) ? (
        <ResultActionsRow>
          {openSecurity ? (
            <Button
              compact
              label={t('screens.voice.results.open-security')}
              onPress={openSecurity}
            />
          ) : null}
          {undoMode && result.previousMode ? (
            <Button
              compact
              icon="refresh"
              label={t('screens.voice.results.undo')}
              onPress={() => undoMode(result)}
            />
          ) : null}
        </ResultActionsRow>
      ) : null}
    </ResultShell>
  );
}

export function ScreenResultCard({ result, actions }: HomeCardProps<ScreenResult>) {
  const { t } = useTranslation();
  const { openScreen, enablesModules, ownerName } = actions;
  const moduleKey = result.module ? MODULE_NAME_KEYS[result.module] : undefined;
  const screenKey = SCREEN_NAME_KEYS[result.screen];
  if (moduleKey) {
    const name = t(moduleKey);
    const title = t('screens.voice.results.module-off', { module: name });
    const hint = enablesModules
      ? t('screens.voice.results.module-off-hint')
      : ownerName
        ? t('screens.voice.results.module-ask-owner', { owner: ownerName, module: name })
        : t('screens.voice.results.module-ask-anyone', { module: name });
    return (
      <ResultShell surface={actions.surface} label={`${title}. ${hint}`}>
        <ResultHead icon="grid" title={title} meta={hint} />
        {enablesModules && openScreen ? (
          <ResultActionsRow>
            <Button
              compact
              variant="primary"
              label={t('screens.voice.results.enable-module', { module: name })}
              onPress={() => openScreen(result)}
            />
          </ResultActionsRow>
        ) : null}
      </ResultShell>
    );
  }
  if (!screenKey || !openScreen) return null;
  const label = t('screens.voice.results.open-screen', { screen: t(screenKey) });
  return (
    <View className="flex-row">
      <Button compact icon="up" label={label} onPress={() => openScreen(result)} />
    </View>
  );
}
