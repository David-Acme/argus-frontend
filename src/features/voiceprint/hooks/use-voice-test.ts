import { useCallback, useState } from 'react';
import type { VoiceprintVerification, VoiceRecording } from '@/core/types';
import { problemOfError, problemOfRecorder, type VoiceprintProblem } from '../model/voiceprint-problem';
import { voiceprintService } from '../services/voiceprint.service';
import { useVoiceCapture } from './use-voice-capture';

const MAX_TEST_SECONDS = 8;

export type VoiceTestPhase = 'idle' | 'recording' | 'checking' | 'answered';

export function useVoiceTest() {
  const [phase, setPhase] = useState<VoiceTestPhase>('idle');
  const [verdict, setVerdict] = useState<VoiceprintVerification | null>(null);
  const [problem, setProblem] = useState<VoiceprintProblem | null>(null);

  const verify = useCallback(async (recording: VoiceRecording) => {
    setPhase('checking');
    const result = await voiceprintService.verify(recording.audio);
    if (result.ok && result.info) {
      setVerdict(result.info);
      setProblem(null);
    } else {
      setVerdict(null);
      setProblem(problemOfError(result.errors));
    }
    setPhase('answered');
  }, []);

  const failed = useCallback((error: unknown) => {
    setVerdict(null);
    setProblem(problemOfRecorder(error));
    setPhase('answered');
  }, []);

  const capture = useVoiceCapture({ maxSeconds: MAX_TEST_SECONDS, onRecorded: verify, onFailed: failed });

  const record = useCallback(async () => {
    setVerdict(null);
    setProblem(null);
    setPhase('recording');
    await capture.start();
  }, [capture]);

  const reset = useCallback(() => {
    capture.cancel();
    setVerdict(null);
    setProblem(null);
    setPhase('idle');
  }, [capture]);

  return { phase, verdict, problem, level: capture.level, record, stop: capture.stop, reset };
}
