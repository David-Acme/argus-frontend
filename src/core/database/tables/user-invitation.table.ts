import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';
import type { InviteRole } from '@/core/types';

export const USER_INVITATION_SCHEMA = tableSchema({
  name: 'user_invitation',
  columns: [
    { name: 'role', type: 'string' },
    { name: 'max_redemptions', type: 'number' },
    { name: 'redemption_count', type: 'number' },
    { name: 'expires_at', type: 'number' },
    { name: 'created_by', type: 'string', isIndexed: true },
    { name: 'revoked_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

/** Owner-only metadata. An invitation's opaque QR token is never persisted. */
export class UserInvitationModel extends Model {
  static table = 'user_invitation';

  @field('role') role!: InviteRole;
  @field('max_redemptions') maxRedemptions!: number;
  @field('redemption_count') redemptionCount!: number;
  @date('expires_at') expiresAt!: Date;
  @field('created_by') createdBy!: string;
  @date('revoked_at') revokedAt!: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
