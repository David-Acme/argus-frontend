import { associations, Model, tableSchema, type Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, json, text } from '@nozbe/watermelondb/decorators';
import type { ZonePoint, ZoneType } from '@/core/types';
import { sanitizeZonePoints } from './sanitizers';
import type { CameraModel } from './camera.table';

export const ZONE_SCHEMA = tableSchema({
  name: 'zone',
  columns: [
    { name: 'camera_id', type: 'string', isIndexed: true },
    { name: 'name', type: 'string' },
    { name: 'points', type: 'string' },
    { name: 'zone_type', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'is_enabled', type: 'boolean' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ZoneModel extends Model {
  static table = 'zone';

  static associations = associations(['camera', { type: 'belongs_to', key: 'camera_id' }]);

  @field('camera_id') cameraId!: string;
  @text('name') name!: string;
  @json('points', sanitizeZonePoints, { memo: true }) points!: ZonePoint[];
  @field('zone_type') zoneType!: ZoneType;
  @text('color') color!: string;
  @field('is_enabled') isEnabled!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @immutableRelation('camera', 'camera_id') camera!: Relation<CameraModel>;
}
