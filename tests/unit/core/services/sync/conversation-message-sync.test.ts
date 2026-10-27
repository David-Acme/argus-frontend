import { describe, expect, test } from 'bun:test';
import type { IAuditLogChange, IAuditLogEntry, ISocketEmitDto } from '@/core/interfaces';
import {
  sanitizeConversationDirection,
  sanitizeConversationKind,
  sanitizeConversationLeg,
  sanitizeConversationReceipt,
  sanitizeConversationState,
  sanitizeVoiceNote,
} from '@/core/database/tables/sanitizers';
import { planAuditEntries, toAuditRemoval } from '@/core/services/sync/audit-log-patch';
import { knowsTable, toDirtyRaw, toModelProps, toPartialModelProps } from '@/core/services/sync/entity-mappers';
import { groupLiveEvents, syncTableKeyOf } from '@/core/services/sync/live-frame-batch';
import { SYNC_TABLES_WITHOUT_DELETIONS } from '@/core/services/sync/sync-constants';
import { buildDeletedBaselineDto, buildSyncDto, pendingDeletedBaselines } from '@/core/services/sync/sync-cursor';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { SYNC_OPERATION } from '@/shared/constants';

const row = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 41,
  userId: 7,
  counterpartId: 3,
  counterpartName: 'David',
  direction: 'out',
  kind: 'relay',
  body: 'Ven a comer',
  leg: null,
  state: 'sent',
  messageKey: 'msg-1',
  replyToKey: null,
  result: null,
  via: null,
  isRead: true,
  readAt: null,
  createdAt: 1_790_000_000,
  updatedAt: null,
  deletedAt: null,
  ...patch,
});

const entry = (id: number, recordId: number, changes: Record<string, IAuditLogChange>): IAuditLogEntry => ({
  id,
  recordId,
  tableName: 'conversation_message',
  changes,
});

describe('the conversation_message table in the sync vocabulary', () => {
  test('is a synced table with deletions', () => {
    expect(SYNC_TABLE_KEYS).toContain('conversation_message');
    expect(knowsTable('conversation_message')).toBe(true);
    expect(syncTableKeyOf('conversation_message')).toBe('conversation_message');
    expect(SYNC_TABLES_WITHOUT_DELETIONS.has('conversation_message')).toBe(false);
  });

  test('a pull asks for its creations and its deletions like the other tables', () => {
    const dto = buildSyncDto(['conversation_message'], {
      conversation_message: { createdStart: 1_790_000_000, createdId: 41, deletedStart: 1_790_000_100, deletedId: 9 },
    });
    expect(dto.conversation_message).toEqual({
      requiredCreate: true,
      created: { startTime: 1_790_000_000, startId: 41 },
      requiredDeleted: true,
      deleted: { startTime: 1_790_000_100, startId: 9 },
    });
  });

  test('its deleted baseline is asked for once, like every table with tombstones', () => {
    expect(pendingDeletedBaselines({})).toContain('conversation_message');
    expect(pendingDeletedBaselines({ conversation_message: { deletedBaseline: true } })).not.toContain(
      'conversation_message'
    );
    expect(buildDeletedBaselineDto(['conversation_message'])).toEqual({
      conversation_message: { findLastDeleted: true },
    });
  });
});

describe('mapping a conversation row', () => {
  test('stores the columns snake_case, ids as strings and times in milliseconds', () => {
    expect(toDirtyRaw('conversation_message', row({ readAt: 1_790_000_050, updatedAt: 1_790_000_060 }))).toEqual({
      id: '41',
      user_id: '7',
      counterpart_id: '3',
      counterpart_name: 'David',
      direction: 'out',
      kind: 'relay',
      body: 'Ven a comer',
      leg: null,
      state: 'sent',
      message_key: 'msg-1',
      reply_to_key: null,
      result: null,
      via: null,
      receipt: null,
      delivered_at: null,
      seen_at: null,
      voice_note: null,
      is_read: true,
      read_at: 1_790_000_050_000,
      created_at: 1_790_000_000_000,
      updated_at: 1_790_000_060_000,
    });
  });

  test("Argus's line keeps its results as JSON and both lines say how they were said", () => {
    const frames = [
      { id: 'a1b2', tool: 'memory.remind', ok: true, data: { title: 'Regar', remindAt: 1_790_000_600 } },
      { id: 'c3d4', tool: 'memory.remind', ok: false, data: {} },
    ];
    const raw = toDirtyRaw('conversation_message', row({ direction: 'in', kind: 'turn', result: frames, via: 'voice' }));
    expect(JSON.parse(String(raw.result))).toEqual(frames);
    expect(raw.via).toBe('voice');
    expect(toModelProps('conversation_message', row({ via: 'text' })).via).toBe('text');
    expect(toModelProps('conversation_message', row({ via: 'sms' })).via).toBeNull();
    expect(toModelProps('conversation_message', row({ result: [{ tool: 'x' }, 'junk'] })).result).toBeNull();
    expect(toModelProps('conversation_message', row({ result: JSON.stringify(frames) })).result).toEqual(frames);
  });

  test('Argus is counterpart 0, kept as the string "0"', () => {
    const props = toModelProps('conversation_message', row({ counterpartId: 0, counterpartName: '', kind: 'turn', leg: 'camera' }));
    expect(props.counterpartId).toBe('0');
    expect(props.counterpartName).toBe('');
    expect(props.leg).toBe('camera');
  });

  test('a null updatedAt is the 0 sentinel and a null reply key stays null', () => {
    const props = toModelProps('conversation_message', row({ replyToKey: null, updatedAt: null }));
    expect(props.updatedAt).toBe(0);
    expect(props.replyToKey).toBeNull();
    expect(toModelProps('conversation_message', row({ kind: 'reply', replyToKey: 'msg-0' })).replyToKey).toBe('msg-0');
  });

  test('a value outside the vocabulary falls back to a safe one', () => {
    expect(sanitizeConversationDirection('sideways')).toBe('in');
    expect(sanitizeConversationKind('broadcast')).toBe('turn');
    expect(sanitizeConversationLeg('watch')).toBeNull();
    expect(sanitizeConversationLeg(null)).toBeNull();
    expect(sanitizeConversationState('lost')).toBe('received');
    expect(sanitizeConversationState('notified')).toBe('notified');
  });

  test('a row carries its receipt, its two receipt times and its voice note', () => {
    const note = { id: 'a'.repeat(32), mime: 'audio/ogg', durationMs: 4200, peaks: [0, 40, 100] };
    const raw = toDirtyRaw(
      'conversation_message',
      row({ receipt: 'delivered', deliveredAt: 1_790_000_010, seenAt: null, voiceNote: note })
    );
    expect(raw.receipt).toBe('delivered');
    expect(raw.delivered_at).toBe(1_790_000_010_000);
    expect(raw.seen_at).toBeNull();
    expect(JSON.parse(String(raw.voice_note))).toEqual(note);
    expect(toModelProps('conversation_message', row({ voiceNote: JSON.stringify(note) })).voiceNote).toEqual(note);
    expect(toModelProps('conversation_message', row({ voiceNote: null })).voiceNote).toBeNull();
  });

  test('a receipt or a voice note outside the wire reads as none', () => {
    expect(sanitizeConversationReceipt('seen')).toBeNull();
    expect(sanitizeConversationReceipt('read')).toBe('read');
    expect(sanitizeVoiceNote({ id: 'short', mime: 'audio/ogg', durationMs: 1, peaks: [] })).toBeNull();
    expect(sanitizeVoiceNote({ id: 'b'.repeat(32), mime: 'audio/wav', durationMs: 1, peaks: [] })).toBeNull();
    expect(sanitizeVoiceNote({ id: 'b'.repeat(32), mime: 'audio/mp4', durationMs: 900.4, peaks: [140, -3, 'x'] })).toEqual({
      id: 'b'.repeat(32),
      mime: 'audio/mp4',
      durationMs: 900,
      peaks: [100, 0, 0],
    });
  });

  test('a field diff maps only the fields it carries', () => {
    expect(
      toPartialModelProps('conversation_message', { state: 'answered', updatedAt: 1_790_000_200 })
    ).toEqual({ state: 'answered', updatedAt: 1_790_000_200_000 });
  });
});

describe('live conversation frames', () => {
  test('an Add carries the full row and a Delete only its tombstone', () => {
    const events: ISocketEmitDto[] = [
      { operation: SYNC_OPERATION.Add, option: 'conversation_message', info: row() },
      { operation: SYNC_OPERATION.Delete, option: 'conversation_message', info: { id: 40, deletedAt: 1_790_000_300 } },
    ];
    const { created, deleted } = groupLiveEvents(events);
    expect(created.get('conversation_message')).toEqual([row()]);
    expect(deleted.get('conversation_message')).toEqual([{ id: 40, deletedAt: 1_790_000_300 }]);
  });

  test('a user audit diff of the delivery state and the read state reaches the row', () => {
    const events: ISocketEmitDto[] = [
      {
        operation: SYNC_OPERATION.Log,
        option: 'user_audit_log',
        info: entry(12, 41, { state: { previous: 'sent', current: 'delivered' } }),
      },
    ];
    expect(groupLiveEvents(events).logs.user.map((log) => log.id)).toEqual([12]);

    const plan = planAuditEntries([
      entry(12, 41, { state: { previous: 'sent', current: 'delivered' } }),
      entry(13, 41, { state: { previous: 'delivered', current: 'answered' } }),
      entry(14, 42, {
        isRead: { previous: false, current: true },
        readAt: { previous: null, current: 1_790_000_400 },
      }),
    ]);
    expect(plan.patches.get('conversation_message')?.get('41')?.props).toEqual({ state: 'answered' });
    expect(plan.patches.get('conversation_message')?.get('42')?.props).toEqual({
      isRead: true,
      readAt: 1_790_000_400_000,
    });
    expect(plan.removals.size).toBe(0);
  });

  test('a receipt diff moves the sender copy forward with its times', () => {
    const plan = planAuditEntries([
      entry(20, 41, {
        receipt: { previous: 'sent', current: 'delivered' },
        deliveredAt: { previous: null, current: 1_790_000_600 },
      }),
      entry(21, 41, {
        receipt: { previous: 'delivered', current: 'read' },
        seenAt: { previous: null, current: 1_790_000_700 },
      }),
    ]);
    expect(plan.patches.get('conversation_message')?.get('41')?.props).toEqual({
      receipt: 'read',
      deliveredAt: 1_790_000_600_000,
      seenAt: 1_790_000_700_000,
    });
  });

  test('a deletedAt in its diff is not a removal: its deletions travel as Delete frames and pulls', () => {
    expect(toAuditRemoval(entry(15, 41, { deletedAt: { previous: null, current: 1_790_000_500 } }))).toBeNull();
  });
});
