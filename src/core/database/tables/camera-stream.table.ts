import { associations, Model, tableSchema, type Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { CameraModel } from './camera.table';

export const CAMERA_STREAM_SCHEMA = tableSchema({
  name: 'camera_stream',
  columns: [
    { name: 'camera_id', type: 'string', isIndexed: true },
    { name: 'label', type: 'string' },
    { name: 'url', type: 'string' },
    { name: 'resolution', type: 'string' },
    { name: 'fps', type: 'number' },
    { name: 'codec', type: 'string' },
    { name: 'is_primary', type: 'boolean' },
    { name: 'is_enabled', type: 'boolean' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class CameraStreamModel extends Model {
  static table = 'camera_stream';

  static associations = associations(['camera', { type: 'belongs_to', key: 'camera_id' }]);

  @field('camera_id') cameraId!: string;
  @text('label') label!: string;
  @text('url') url!: string;
  @text('resolution') resolution!: string;
  @field('fps') fps!: number;
  @text('codec') codec!: string;
  @field('is_primary') isPrimary!: boolean;
  @field('is_enabled') isEnabled!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @immutableRelation('camera', 'camera_id') camera!: Relation<CameraModel>;
}
