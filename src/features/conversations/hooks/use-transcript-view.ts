import { useState } from 'react';
import { nextTranscriptView, type TranscriptView } from '@/features/conversations/model/voice-note';

export type TranscriptAction = { expanded: boolean; toggle: () => void };

export type TranscriptViewState = {
  view: TranscriptView;
  setView: (view: TranscriptView) => void;
  action: TranscriptAction;
};

export function useTranscriptView(transcript: string): TranscriptViewState {
  const [view, setView] = useState<TranscriptView>('hidden');
  const toggle = () =>
    setView((current) =>
      current === 'hidden' ? nextTranscriptView(current, transcript) : 'hidden'
    );
  return { view, setView, action: { expanded: view !== 'hidden', toggle } };
}
