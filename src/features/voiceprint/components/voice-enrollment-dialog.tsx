import { useState } from 'react';
import { View } from 'react-native';
import type { VoiceprintStatus } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceEnrollment } from '../hooks/use-voice-enrollment';
import { isBusy } from '../model/enrollment';
import { VOICEPRINT_PROBLEM_KEYS } from '../model/voiceprint-problem';
import { PhraseProgress } from './phrase-progress';
import { VoiceLevel } from './voice-level';

type VoiceEnrollmentDialogProps = {
  onClose: () => void;
  onEnrolled: (status: VoiceprintStatus) => void;
};

type ConsentPointProps = {
  text: string;
};

function ConsentPoint({ text }: ConsentPointProps) {
  return (
    <View className="flex-row gap-3">
      <Icon name="check" className="text-success mt-0.5 size-4" />
      <Text variant="body" className="text-foreground-secondary min-w-0 flex-1">
        {text}
      </Text>
    </View>
  );
}

export function VoiceEnrollmentDialog({ onClose, onEnrolled }: VoiceEnrollmentDialogProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const enrollment = useVoiceEnrollment({ onEnrolled });
  const { state } = enrollment;
  const phraseState = state.phrases[state.current];
  const phrase = state.challenge?.phrases[state.current] ?? '';
  const busy = isBusy(state);
  const problem = state.problem ? t(VOICEPRINT_PROBLEM_KEYS[state.problem]) : null;
  const onConsent = state.phase === 'consent' || state.phase === 'starting';

  const close = () => {
    enrollment.reset();
    onClose();
  };

  const change = (open: boolean) => {
    if (!open) close();
  };

  const recordLabel =
    phraseState === 'rejected' ? t('screens.voiceprint.enroll.retry') : t('screens.voiceprint.enroll.record');

  const footer = onConsent ? (
    <>
      <Button variant="outline" onPress={close}>
        <Text>{t('common.cancel')}</Text>
      </Button>
      <Button onPress={enrollment.begin} disabled={!accepted} loading={state.phase === 'starting'}>
        <Text>{t('screens.voiceprint.consent.start')}</Text>
      </Button>
    </>
  ) : state.phase === 'done' ? (
    <Button onPress={close}>
      <Text>{t('common.close')}</Text>
    </Button>
  ) : (
    <>
      <Button variant="outline" onPress={close} disabled={state.phase === 'finishing'}>
        <Text>{t('common.cancel')}</Text>
      </Button>
      {enrollment.recording ? (
        <Button onPress={enrollment.stop}>
          <Icon name="square" />
          <Text>{t('screens.voiceprint.enroll.stop')}</Text>
        </Button>
      ) : (
        <Button onPress={enrollment.record} disabled={busy} loading={busy}>
          <Icon name="mic" />
          <Text>{recordLabel}</Text>
        </Button>
      )}
    </>
  );

  return (
    <AdaptiveDialog
      open
      onOpenChange={change}
      title={onConsent ? t('screens.voiceprint.consent.title') : t('screens.voiceprint.enroll.title')}
      closeLabel={t('common.close')}
      dismissible={!enrollment.recording && state.phase !== 'finishing'}
      footer={footer}>
      {onConsent ? (
        <View className="gap-4">
          <Text variant="body">{t('screens.voiceprint.consent.intro')}</Text>
          <View className="gap-2.5">
            <ConsentPoint text={t('screens.voiceprint.consent.point-stored')} />
            <ConsentPoint text={t('screens.voiceprint.consent.point-use')} />
            <ConsentPoint text={t('screens.voiceprint.consent.point-delete')} />
          </View>
          <ToggleRow label={t('screens.voiceprint.consent.accept')} value={accepted} onChange={setAccepted} />
          {problem ? (
            <Text variant="label" className="text-error-strong">
              {problem}
            </Text>
          ) : null}
        </View>
      ) : state.phase === 'done' ? (
        <View className="items-center gap-3 py-4">
          <View className="bg-success/15 size-14 items-center justify-center rounded-full">
            <Icon name="check-circle" className="text-success size-7" />
          </View>
          <Text variant="headline">{t('screens.voiceprint.enroll.done-title')}</Text>
          <Text variant="body" className="text-foreground-secondary text-center">
            {t('screens.voiceprint.enroll.done-description')}
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          <View className="gap-2">
            <PhraseProgress phrases={state.phrases} current={state.current} />
            <Text variant="caption" className="text-center">
              {t('screens.voiceprint.enroll.phrase', {
                current: String(state.current + 1),
                total: String(state.phrases.length),
              })}
            </Text>
          </View>
          <View className="bg-surface-secondary dark:bg-card-secondary min-h-24 items-center justify-center rounded-lg px-5 py-6">
            <Text variant="headline" className="text-center">
              {state.phase === 'finishing' ? t('screens.voiceprint.enroll.finishing') : `«${phrase}»`}
            </Text>
          </View>
          <VoiceLevel level={enrollment.level} active={enrollment.recording} />
          <Text
            variant="label"
            className={problem ? 'text-error-strong text-center' : 'text-foreground-secondary text-center'}
            accessibilityLiveRegion="polite">
            {problem ??
              (enrollment.recording
                ? t('screens.voiceprint.enroll.recording')
                : phraseState === 'checking'
                  ? t('screens.voiceprint.enroll.checking')
                  : t('screens.voiceprint.enroll.instruction'))}
          </Text>
          <Text variant="caption" className="text-center">
            {t('screens.voiceprint.enroll.quiet-room')}
          </Text>
        </View>
      )}
    </AdaptiveDialog>
  );
}
