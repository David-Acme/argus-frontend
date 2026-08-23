import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { UserInvitationModel } from '@/core/database';
import { DatabaseService } from './database.service';

class UserInvitationService extends DatabaseService<'user_invitation'> {
  constructor() {
    super('user_invitation');
  }

  observeList(): Observable<UserInvitationModel[]> {
    return this.observeManyWithColumns(
      ['role', 'max_redemptions', 'redemption_count', 'expires_at', 'revoked_at', 'updated_at'],
      [Q.sortBy('created_at', Q.desc)],
    );
  }
}

export const userInvitationService = new UserInvitationService();
