import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';
import type { UserLang, UserRole } from '@/core/types';

export const USER_SCHEMA = tableSchema({
  name: 'user',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'last_name', type: 'string' },
    { name: 'role', type: 'string' },
    { name: 'lang', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class UserModel extends Model {
  static table = 'user';

  @text('name') name!: string;
  @text('last_name') lastName!: string;
  @field('role') role!: UserRole;
  @field('lang') lang!: UserLang;
  @field('is_active') isActive!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
