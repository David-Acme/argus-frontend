import type { IconGlyph } from '@/shared/ui/icon';

const GLYPHS: Readonly<Record<string, IconGlyph>> = {
  camera: 'cam',
  zone: 'cam',
  reminder: 'bell',
  calendar_event: 'cal',
  calendar_event_share: 'cal',
  project: 'grid',
  project_member: 'users',
  project_task: 'check',
  event: 'shield',
  person: 'user',
  notification: 'bell',
  user: 'user',
  user_invitation: 'qr',
  module: 'grid',
};

export const activityGlyph = (table: string): IconGlyph => GLYPHS[table] ?? 'activity';

export const RECENT_SHOWN = 5;

export const ACTIVITY_HREF = '/settings/activity';
