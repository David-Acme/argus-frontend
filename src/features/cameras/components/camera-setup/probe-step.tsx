import type { ICameraProbeStep } from '@/core/interfaces';
import type { CameraProbeStepStatus, TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { AvatarTone } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Stack } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import type { CameraProbe } from '@/features/cameras/hooks/use-camera-probe';
import {
  hasMicrophone,
  probeResolution,
  probeStepCopy,
  probeVerdict,
} from '@/features/cameras/model/camera-probe';
import type { ProbeRefusal, ProbeVerdict } from '@/features/cameras/model/camera-probe';

export type ProbeStepProps = { probe: CameraProbe };

type StepRowProps = { step: ICameraProbeStep };

const STATUS: Record<CameraProbeStepStatus, { icon: IconGlyph; tone: AvatarTone }> = {
  ok: { icon: 'check', tone: 'ok' },
  failed: { icon: 'x', tone: 'alert' },
  warning: { icon: 'alert', tone: 'attn' },
  skipped: { icon: 'more', tone: 'default' },
};

const VERDICT = {
  ok: 'screens.cameras.probe.verdict-ok',
  warning: 'screens.cameras.probe.verdict-warning',
  failed: 'screens.cameras.probe.verdict-failed',
} as const satisfies Record<ProbeVerdict, TranslationKey>;

const REFUSAL = {
  'stored-elsewhere': 'screens.cameras.probe.stored-elsewhere',
  busy: 'screens.cameras.probe.busy',
  'no-password': 'screens.cameras.probe.no-password',
} as const satisfies Record<ProbeRefusal, TranslationKey>;

function StepRow({ step }: StepRowProps) {
  const { t } = useTranslation();
  const copy = probeStepCopy(step);
  const status = STATUS[step.status];
  return (
    <Row
      leading={<Avatar icon={status.icon} tone={status.tone} />}
      title={t(copy.title)}
      meta={copy.hint ? t(copy.hint) : undefined}
    />
  );
}

export function ProbeStep({ probe }: ProbeStepProps) {
  const { t } = useTranslation();
  const retry = { label: t('screens.cameras.probe.retry'), onPress: probe.run };
  if (probe.running || (!probe.result && !probe.failed))
    return (
      <Notice
        presence="search"
        title={t('screens.cameras.probe.running')}
        body={t('screens.cameras.probe.running-hint')}
      />
    );
  if (!probe.result)
    return (
      <Notice
        icon={probe.refusal ? 'key' : 'wifioff'}
        tone="attention"
        title={probe.refusal ? t(REFUSAL[probe.refusal]) : t('screens.cameras.probe.not-run')}
        action={retry}
      />
    );
  const result = probe.result;
  const verdict = probeVerdict(result);
  const details = [
    result.device.model,
    result.device.firmware,
    probeResolution(result),
    result.stream.videoCodec,
    hasMicrophone(result) ? t('screens.cameras.probe.has-microphone') : '',
  ].filter(Boolean);
  return (
    <Stack gap={3}>
      <Notice
        icon={verdict === 'ok' ? 'check' : verdict === 'warning' ? 'alert' : 'wifioff'}
        tone={verdict === 'ok' ? 'info' : 'attention'}
        title={t(VERDICT[verdict])}
        body={details.length > 0 ? details.join(' · ') : undefined}
        action={retry}
      />
      <Stack gap={1}>
        {result.steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </Stack>
    </Stack>
  );
}
