import { ActivityIndicator, View } from 'react-native';
import { useUniwind } from 'uniwind';
import type { ICameraProbeResult, ICameraProbeStep } from '@/core/interfaces';
import type { CameraProbeStepStatus, IconName } from '@/core/types';
import {
  hasMicrophone,
  probeResolution,
  probeStepCopy,
  probeVerdict,
  type ProbeRefusal,
} from '@/features/cameras/model/camera-probe';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { colorTokens } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraProbePanelProps = {
  running: boolean;
  result: ICameraProbeResult | null;
  failedToRun: boolean;
  refusal?: ProbeRefusal | null;
  onRetry: () => void;
};

const REFUSAL_ICON: Record<ProbeRefusal, IconName> = {
  'stored-elsewhere': 'key-round',
  busy: 'clock',
};

type ProbeStepRowProps = {
  step: ICameraProbeStep;
};

const STATUS_ICON: Record<CameraProbeStepStatus, IconName> = {
  ok: 'check-circle',
  failed: 'x',
  warning: 'triangle-alert',
  skipped: 'minus',
};

const STATUS_TONE: Record<CameraProbeStepStatus, string> = {
  ok: 'text-success',
  failed: 'text-error-strong',
  warning: 'text-warning-strong',
  skipped: 'text-muted-foreground',
};

function ProbeStepRow({ step }: ProbeStepRowProps) {
  const { t } = useTranslation();
  const copy = probeStepCopy(step);
  return (
    <View className="flex-row gap-3 py-1.5">
      <Icon name={STATUS_ICON[step.status]} className={cn('mt-0.5 size-5', STATUS_TONE[step.status])} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{t(copy.title)}</Text>
        {copy.hint ? <Text variant="caption">{t(copy.hint)}</Text> : null}
      </View>
    </View>
  );
}

export function CameraProbePanel({ running, result, failedToRun, refusal, onRetry }: CameraProbePanelProps) {
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const spinner = colorTokens[theme === 'dark' ? 'dark' : 'light']['muted-foreground'];

  if (running || (!result && !failedToRun)) {
    return (
      <View className="bg-surface-secondary dark:bg-card-secondary items-center gap-3 rounded-2xl px-4 py-8">
        <ActivityIndicator color={spinner} />
        <Text variant="label">{t('screens.cameras.probe.running')}</Text>
        <Text variant="caption" className="text-center">
          {t('screens.cameras.probe.running-hint')}
        </Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View className="bg-surface-secondary dark:bg-card-secondary items-center gap-3 rounded-2xl px-4 py-6">
        <Icon name={refusal ? REFUSAL_ICON[refusal] : 'wifi-off'} className="text-muted-foreground size-6" />
        <Text variant="label" className="text-center">
          {refusal ? t(`screens.cameras.probe.${refusal}`) : t('screens.cameras.probe.not-run')}
        </Text>
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Text>{t('screens.cameras.probe.retry')}</Text>
        </Button>
      </View>
    );
  }

  const verdict = probeVerdict(result);
  const resolution = probeResolution(result);
  const details = [
    result.device.model,
    result.device.firmware,
    resolution,
    result.stream.videoCodec,
    hasMicrophone(result) ? t('screens.cameras.probe.has-microphone') : '',
  ].filter(Boolean);

  return (
    <View className="gap-3">
      <View
        className={cn(
          'flex-row items-center gap-3 rounded-2xl px-4 py-3',
          verdict === 'ok' ? 'bg-success/10' : verdict === 'warning' ? 'bg-warning/15' : 'bg-error/10',
        )}>
        <Icon
          name={verdict === 'ok' ? 'check-circle' : verdict === 'warning' ? 'triangle-alert' : 'wifi-off'}
          className={cn(
            'size-6',
            verdict === 'ok' ? 'text-success' : verdict === 'warning' ? 'text-warning-strong' : 'text-error-strong',
          )}
        />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="subhead">{t(`screens.cameras.probe.verdict-${verdict}`)}</Text>
          {details.length > 0 ? (
            <Text variant="caption" numberOfLines={2}>
              {details.join(' · ')}
            </Text>
          ) : null}
        </View>
        <Button variant="outline" size="sm" onPress={onRetry} accessibilityLabel={t('screens.cameras.probe.retry')}>
          <Icon name="refresh-cw" className="text-foreground size-4" />
        </Button>
      </View>
      <View className="gap-0.5 px-1">
        {result.steps.map((step) => (
          <ProbeStepRow key={step.id} step={step} />
        ))}
      </View>
    </View>
  );
}
