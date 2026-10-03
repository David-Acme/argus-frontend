import { useCallback, useEffect, useReducer } from 'react';
import type { VoiceprintStatus, VoiceRecording } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { enrollmentReducer, INITIAL_ENROLLMENT, readyToFinish } from '../model/enrollment';
import { problemOfError, problemOfRecorder } from '../model/voiceprint-problem';
import { voiceprintService } from '../services/voiceprint.service';
import { useVoiceCapture } from './use-voice-capture';

const MAX_PHRASE_SECONDS = 10;

type VoiceEnrollmentOptions = {
  onEnrolled: (status: VoiceprintStatus) => void;
};

export function useVoiceEnrollment({ onEnrolled }: VoiceEnrollmentOptions) {
  const { language } = useTranslation();
  const [state, dispatch] = useReducer(enrollmentReducer, INITIAL_ENROLLMENT);
  const challengeId = state.challenge?.challengeId ?? '';
  const consentVersion = state.challenge?.consentVersion ?? '';
  const current = state.current;

  const upload = useCallback(
    async (recording: VoiceRecording) => {
      dispatch({ type: 'check' });
      const result = await voiceprintService.sample({ audio: recording.audio, challengeId, phrase: current });
      if (result.ok && result.info) dispatch({ type: 'checked', result: result.info });
      else dispatch({ type: 'failed', problem: problemOfError(result.errors) });
    },
    [challengeId, current],
  );

  const failed = useCallback((error: unknown) => dispatch({ type: 'failed', problem: problemOfRecorder(error) }), []);

  const capture = useVoiceCapture({ maxSeconds: MAX_PHRASE_SECONDS, onRecorded: upload, onFailed: failed });

  const begin = useCallback(async () => {
    dispatch({ type: 'start' });
    const result = await voiceprintService.challenge(language);
    if (result.ok && result.info) dispatch({ type: 'challenge', challenge: result.info });
    else dispatch({ type: 'failed', problem: problemOfError(result.errors) });
  }, [language]);

  const record = useCallback(async () => {
    dispatch({ type: 'record' });
    await capture.start();
  }, [capture]);

  const reset = useCallback(() => {
    capture.cancel();
    dispatch({ type: 'reset' });
  }, [capture]);

  const finish = useCallback(async () => {
    dispatch({ type: 'finish' });
    const result = await voiceprintService.enroll({ challengeId, consentVersion });
    if (result.ok && result.info) {
      dispatch({ type: 'finished' });
      onEnrolled(result.info);
    } else {
      dispatch({ type: 'failed', problem: problemOfError(result.errors) });
    }
  }, [challengeId, consentVersion, onEnrolled]);

  const ready = readyToFinish(state);

  useEffect(() => {
    if (ready) void finish();
  }, [finish, ready]);

  return {
    state,
    recording: capture.recording,
    level: capture.level,
    begin,
    record,
    stop: capture.stop,
    reset,
  };
}
