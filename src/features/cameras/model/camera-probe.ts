import type { ICameraProbeResult, ICameraProbeStep, IServiceResponse } from '@/core/interfaces';
import type { CameraProbeStepId, TranslationKey } from '@/core/types';

export type ProbeVerdict = 'ok' | 'warning' | 'failed';

export type ProbeStepCopy = {
  title: TranslationKey;
  hint: TranslationKey | null;
};

const STEP_TITLE = {
  network: 'screens.cameras.probe.step-network',
  main: 'screens.cameras.probe.step-main',
  sub: 'screens.cameras.probe.step-sub',
  device: 'screens.cameras.probe.step-device',
  talk: 'screens.cameras.probe.step-talk',
} as const satisfies Record<CameraProbeStepId, TranslationKey>;

const CODE_HINT: Record<string, TranslationKey> = {
  unreachable: 'screens.cameras.probe.hint-unreachable',
  refused: 'screens.cameras.probe.hint-refused',
  auth_failed: 'screens.cameras.probe.hint-auth',
  not_found: 'screens.cameras.probe.hint-path',
  no_video: 'screens.cameras.probe.hint-no-video',
  protocol: 'screens.cameras.probe.hint-protocol',
  no_credentials: 'screens.cameras.probe.hint-no-credentials',
  cloud_password_missing: 'screens.cameras.probe.hint-cloud',
};

const DEVICE_HINT: Record<string, TranslationKey> = {
  auth_failed: 'screens.cameras.probe.hint-device-auth',
  unreachable: 'screens.cameras.probe.hint-device-unreachable',
};

export function probeStepCopy(step: ICameraProbeStep): ProbeStepCopy {
  if (step.status === 'ok' || step.status === 'skipped') {
    return { title: STEP_TITLE[step.id], hint: step.code === 'no_credentials' ? CODE_HINT.no_credentials ?? null : null };
  }
  const hint = (step.id === 'device' ? DEVICE_HINT[step.code] : undefined) ?? CODE_HINT[step.code] ?? null;
  return { title: STEP_TITLE[step.id], hint };
}

export function probeVerdict(result: ICameraProbeResult): ProbeVerdict {
  if (!result.ok) return 'failed';
  return result.steps.some((step) => step.status === 'failed' || step.status === 'warning') ? 'warning' : 'ok';
}

export function probeResolution(result: ICameraProbeResult): string {
  const { width, height } = result.stream;
  return width > 0 && height > 0 ? `${width}×${height}` : '';
}

export function hasMicrophone(result: ICameraProbeResult): boolean {
  return result.stream.audioCodec.length > 0;
}

export type ProbeRefusal = 'stored-elsewhere' | 'busy' | 'no-password';

const STORED_ELSEWHERE = /stored address/i;

export function probeRefusalOf(
  response: Pick<IServiceResponse<unknown>, 'status' | 'errors'>,
  optedOutOfPassword = false,
): ProbeRefusal | null {
  if (response.status === 429) return 'busy';
  if (response.status === 422 && STORED_ELSEWHERE.test(response.errors?.message ?? ''))
    return optedOutOfPassword ? 'no-password' : 'stored-elsewhere';
  return null;
}
