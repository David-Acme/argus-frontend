import { t } from '@/core/i18n';
import { log } from '@/core/services/log';
import { permissionsService } from '@/core/services/permissions';
import type { ConfirmRequest, PermissionAnswer, RuntimePermission } from '@/core/types';
import { confirm } from './confirm';

export type PermissionStep = 'granted' | 'explain' | 'settings' | 'skip';

export type PermissionPromptOptions = {
  once?: boolean;
};

export type PermissionPromptPort = {
  read: (kind: RuntimePermission) => Promise<PermissionAnswer>;
  request: (kind: RuntimePermission) => Promise<PermissionAnswer>;
  openSettings: () => Promise<void>;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
  asked: (kind: RuntimePermission) => boolean;
  markAsked: (kind: RuntimePermission) => void;
};

export function permissionStep(answer: PermissionAnswer, once: boolean, asked: boolean): PermissionStep {
  if (answer.granted) return 'granted';
  if (once && asked) return 'skip';
  if (answer.canAskAgain) return 'explain';
  return once ? 'skip' : 'settings';
}

const explanation = (kind: RuntimePermission): ConfirmRequest => ({
  title: t(`common.permission-prompt.${kind}.title`),
  description: t(`common.permission-prompt.${kind}.reason`),
  confirmLabel: t('common.permission-prompt.allow'),
  cancelLabel: t('common.permission-prompt.not-now'),
});

const settingsOffer = (kind: RuntimePermission): ConfirmRequest => ({
  title: t(`common.permission-prompt.${kind}.blocked-title`),
  description: t(`common.permission-prompt.${kind}.blocked`),
  confirmLabel: t('common.permission-prompt.open-settings'),
  cancelLabel: t('common.permission-prompt.not-now'),
});

const devicePort: PermissionPromptPort = {
  read: (kind) => permissionsService.read(kind),
  request: (kind) => permissionsService.request(kind),
  openSettings: () => permissionsService.openSettings(),
  confirm,
  asked: (kind) => permissionsService.asked(kind),
  markAsked: (kind) => permissionsService.markAsked(kind),
};

export async function ensurePermission(
  kind: RuntimePermission,
  options: PermissionPromptOptions = {},
  port: PermissionPromptPort = devicePort,
): Promise<boolean> {
  try {
    const step = permissionStep(await port.read(kind), options.once === true, port.asked(kind));
    if (step === 'granted') return true;
    if (step === 'skip') return false;
    if (step === 'settings') {
      if (await port.confirm(settingsOffer(kind))) await port.openSettings();
      return false;
    }
    const accepted = await port.confirm(explanation(kind));
    port.markAsked(kind);
    if (!accepted) return false;
    return (await port.request(kind)).granted;
  } catch (error) {
    log.error('permissions', `the ${kind} permission could not be asked`, error);
    return false;
  }
}
