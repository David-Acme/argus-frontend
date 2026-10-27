import type { ICameraCacheRow } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { GuardEnvironment, GuardMode, TranslateFn, VoiceAction } from '@/core/types';
import { GUARD_MODES, VIEW_CACHE_KEYS } from '@/shared/constants';
import type { AccessView } from '@/shared/libs/capabilities';
import { serviceErrorKey } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { matchEnvironment } from '@/features/security';
import { cameraPlacementOf } from '@/features/voice/model/argus-result';
import type { ActionSettlement } from '@/features/voice/model/argus-result';
import { spokenDetail } from '@/features/voice/model/call-situation';
import {
  cameraViewOf,
  resolveCameraId,
  routeForScreen,
} from '@/features/voice/model/voice-actions';
import { voiceService } from '@/features/voice/services/voice';

export type ActionRunnerDeps = {
  t: TranslateFn;
  push: (href: string) => void;
  path: () => string;
  access: () => AccessView;
  lastEventCamera: () => string | null;
  watchesCameras: boolean;
  setsGuardMode: boolean;
};

export type ActionRun = (action: VoiceAction, inCall: boolean) => Promise<ActionSettlement>;

const DONE: ActionSettlement = { outcome: { ok: true, detail: null } };

const failed = (detail: string): ActionSettlement => ({
  outcome: { ok: false, detail: spokenDetail(detail) },
});

const isGuardMode = (mode: unknown): mode is GuardMode =>
  typeof mode === 'string' && (GUARD_MODES as readonly string[]).includes(mode);

const textArgument = (value: unknown): string => (typeof value === 'string' ? value : '');

function showCamera(
  deps: ActionRunnerDeps,
  action: VoiceAction,
  inCall: boolean
): ActionSettlement {
  const { t } = deps;
  if (!deps.watchesCameras) return failed(t('screens.voice.actions.detail.no-access'));
  const cameras = viewCacheService.read<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const id = resolveCameraId({
    requested: textArgument(action.arguments.camera),
    cameras,
    lastEventCameraId: deps.lastEventCamera(),
  });
  if (!id) {
    toast.error(t('screens.voice.actions.camera-missing'));
    return failed(t('screens.voice.actions.detail.camera-missing'));
  }
  const placement = cameraPlacementOf({ inCall, path: deps.path() });
  if (placement === 'call') voiceService.showCamera(id, cameraViewOf(action.arguments.view));
  if (placement === 'screen') deps.push(`/cameras/${id}`);
  const cameraName = cameras.find((camera) => camera.id === id)?.name;
  return { ...DONE, cameraId: id, ...(cameraName ? { cameraName } : {}) };
}

async function environmentsFor(hint: string): Promise<readonly GuardEnvironment[]> {
  const cached = viewCacheService.readValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments);
  if (cached || !hint) return cached ?? [];
  return (await guardService.environments()).info ?? [];
}

async function setGuardMode(
  deps: ActionRunnerDeps,
  action: VoiceAction
): Promise<ActionSettlement> {
  const { t } = deps;
  if (!deps.setsGuardMode) return failed(t('screens.voice.actions.detail.no-access'));
  const mode = action.arguments.mode;
  if (!isGuardMode(mode)) return failed(t('screens.voice.actions.detail.bad-mode'));
  const hint = textArgument(action.arguments.environment);
  const environments = await environmentsFor(hint);
  const match = matchEnvironment(environments, hint);
  if (match.kind === 'unknown') {
    const names = environments.map((environment) => environment.name).join(', ');
    return failed(t('screens.voice.actions.detail.unknown-environment', { names }));
  }
  const target = match.kind === 'one' ? match.environment : undefined;
  const result = await guardService.setMode(mode, target?.id);
  if (!result.ok || !result.info) {
    const message = t(serviceErrorKey(result.errors));
    toast.error(message);
    return failed(message);
  }
  viewCacheService.writeValue(VIEW_CACHE_KEYS.guardEnvironments, result.info);
  return DONE;
}

function openScreen(deps: ActionRunnerDeps, action: VoiceAction): ActionSettlement {
  const route = routeForScreen(
    String(action.arguments.screen ?? ''),
    deps.access(),
    typeof action.arguments.module === 'string' ? action.arguments.module : undefined
  );
  if (!route) return failed(deps.t('screens.voice.actions.detail.no-access'));
  deps.push(route);
  return DONE;
}

export function actionRunner(deps: ActionRunnerDeps): ActionRun {
  const run = (action: VoiceAction, inCall: boolean): Promise<ActionSettlement> => {
    if (action.name === 'app.show_camera') return Promise.resolve(showCamera(deps, action, inCall));
    if (action.name === 'app.open') return Promise.resolve(openScreen(deps, action));
    return setGuardMode(deps, action);
  };
  return (action, inCall) =>
    run(action, inCall).catch(() => failed(deps.t('screens.voice.actions.detail.failed')));
}
