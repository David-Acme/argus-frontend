import { useState } from 'react';
import { t } from '@/core/i18n';
import { guardService } from '@/core/services/guard.service';
import type { GuardEnvironment, GuardMode } from '@/core/types';
import { confirm } from '@/shared/libs/confirm';
import { runServiceAction } from '@/shared/libs/service-action';
import { toast } from '@/shared/libs/toast';
import { feedback } from '@/shared/theme';
import { askDisarmPin, safetyService } from '@/features/safety';
import { MODE_LABEL } from '@/features/security/constants/security.constant';
import { maskedInScope, withMode } from '@/features/security/model/environments';
import {
  modeExpectsProtection,
  modeLowers,
  undoTarget,
} from '@/features/security/model/mode-change';

export type PendingMode = { mode: GuardMode; environmentId: number | null };

export type ModeEnvironments = {
  data: GuardEnvironment[] | null;
  mutate: (update: (previous: GuardEnvironment[] | null) => GuardEnvironment[] | null) => void;
};

async function maskedAccepted(
  mode: GuardMode,
  environments: readonly GuardEnvironment[] | null,
  target?: GuardEnvironment
): Promise<boolean> {
  const masked = maskedInScope(environments, target?.id);
  if (!modeExpectsProtection(mode) || masked.length === 0) return true;
  return confirm({
    title: t('screens.security.mask.arm-title'),
    description: t('screens.security.mask.arm-body', {
      names: masked.map((camera) => camera.name).join(', '),
    }),
    confirmLabel: t('screens.security.mask.arm-anyway'),
    intent: 'warning',
  });
}

async function pinFor(
  mode: GuardMode,
  environments: readonly GuardEnvironment[] | null,
  target?: GuardEnvironment
): Promise<string | undefined | null> {
  if (!modeLowers(mode, environments, target?.id)) return undefined;
  if (!(await safetyService.disarmNeedsPin())) return undefined;
  return askDisarmPin();
}

type ModeRun = { mode: GuardMode; target?: GuardEnvironment; known: GuardEnvironment[] | null };

export function useGuardMode({ data, mutate }: ModeEnvironments) {
  const [pendingMode, setPendingMode] = useState<PendingMode | null>(null);

  async function run({ mode, target, known }: ModeRun): Promise<boolean> {
    if (!(await maskedAccepted(mode, known, target))) return false;
    const pin = await pinFor(mode, known, target);
    if (pin === null) return false;
    const previous = undoTarget(known, mode, target?.id);
    let snapshot: GuardEnvironment[] | null = null;
    setPendingMode({ mode, environmentId: target?.id ?? null });
    mutate((current) => {
      snapshot = current;
      return current ? withMode(current, mode, target?.id) : current;
    });
    const result = await runServiceAction({
      call: () => guardService.setMode(mode, target?.id, pin),
    });
    setPendingMode(null);
    const saved = result?.info ?? null;
    mutate(() => saved ?? snapshot);
    if (!saved) return false;
    feedback('success');
    const undo = previous
      ? {
          label: t('common.undo'),
          onPress: () => void run({ mode: previous, target, known: saved }),
        }
      : undefined;
    toast.info(
      t('screens.security.hero.mode-changed', { mode: t(MODE_LABEL[mode]) }),
      target?.name,
      undo
    );
    return true;
  }

  const setMode = (mode: GuardMode, target?: GuardEnvironment) =>
    run({ mode, target, known: data });

  return { pendingMode, setMode };
}
