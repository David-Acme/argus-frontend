import { conversationService } from '@/core/services/conversation.service';
import type { VoiceNoteContent } from '@/core/types';
import { noteEngine } from '@/features/conversations/services/note-player/note-engine';
import { NotePlayer } from '@/features/conversations/services/note-player/note-player';

const fetchContent = async (noteId: string): Promise<VoiceNoteContent | null> => {
  const grant = await conversationService.voiceNoteGrant(noteId);
  if (!grant.ok || !grant.info) return null;
  const content = await conversationService.voiceNoteContent(grant.info.token);
  return content.ok ? content.info : null;
};

export const notePlayer = new NotePlayer({ engine: noteEngine, fetchContent });
