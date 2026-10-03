import { associations, Model, tableSchema, type Query } from '@nozbe/watermelondb';
import { children, date, field, json, text } from '@nozbe/watermelondb/decorators';
import type {
  CameraCapabilities,
  CameraConfig,
  CameraDriverKind,
  CameraRecordMode,
} from '@/core/types';
import { sanitizeObject, sanitizeStringArray } from './sanitizers';
import type { CameraStreamModel } from './camera-stream.table';
import type { ZoneModel } from './zone.table';

export const CAMERA_SCHEMA = tableSchema({
  name: 'camera',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'manufacturer', type: 'string' },
    { name: 'model', type: 'string' },
    { name: 'ip', type: 'string' },
    { name: 'port', type: 'number' },
    { name: 'username', type: 'string' },
    { name: 'cloud_username', type: 'string' },
    { name: 'driver', type: 'string', isIndexed: true },
    { name: 'icon', type: 'string' },
    { name: 'record_mode', type: 'string' },
    { name: 'retention_days', type: 'number', isOptional: true },
    { name: 'capabilities', type: 'string' },
    { name: 'config', type: 'string' },
    { name: 'is_enabled', type: 'boolean' },
    { name: 'is_online', type: 'boolean' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class CameraModel extends Model {
  static table = 'camera';

  static associations = associations(
    ['camera_stream', { type: 'has_many', foreignKey: 'camera_id' }],
    ['zone', { type: 'has_many', foreignKey: 'camera_id' }],
  );

  @text('name') name!: string;
  @text('manufacturer') manufacturer!: string;
  @text('model') model!: string;
  @text('ip') ip!: string;
  @field('port') port!: number;
  @text('username') username!: string;
  @text('cloud_username') cloudUsername!: string;
  @field('driver') driver!: CameraDriverKind;
  @text('icon') icon!: string;
  @field('record_mode') recordMode!: CameraRecordMode;
  @field('retention_days') retentionDays!: number | null;
  @json('capabilities', sanitizeStringArray, { memo: true }) capabilities!: CameraCapabilities;
  @json('config', sanitizeObject) config!: CameraConfig;
  @field('is_enabled') isEnabled!: boolean;
  @field('is_online') isOnline!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('camera_stream') streams!: Query<CameraStreamModel>;
  @children('zone') zones!: Query<ZoneModel>;
}
