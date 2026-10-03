import type { VoiceSttFrame } from '@/core/types';

type FrameRecord = Record<string, unknown>;

function asRecord(payload: unknown): FrameRecord | null {
  return typeof payload === 'object' && payload !== null ? (payload as FrameRecord) : null;
}

export function parseTurnId(payload: unknown): string | null {
  const id = asRecord(payload)?.id;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.length > 0) return id;
  return null;
}

export function parseSttFrame(payload: unknown): VoiceSttFrame | null {
  const record = asRecord(payload);
  if (!record || typeof record.text !== 'string') return null;
  return { text: record.text, final: record.final === true };
}

export function parseAssistantText(payload: unknown): string | null {
  const text = asRecord(payload)?.text;
  return typeof text === 'string' ? text : null;
}

export function parseVoiceError(payload: unknown): string {
  const record = asRecord(payload);
  if (record && typeof record.error === 'string' && record.error.length > 0) return record.error;
  const status = record && (typeof record.status === 'number' || typeof record.status === 'string') ? record.status : '';
  return `VOICE_ERROR|${status}`.trim();
}
