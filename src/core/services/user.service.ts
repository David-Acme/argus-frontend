import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { UserModel } from '@/core/database';
import { DatabaseService } from './database.service';

class UserService extends DatabaseService<'user'> {
  constructor() {
    super('user');
  }

  observeDirectory(): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'role', 'is_active', 'created_at'],
      [Q.sortBy('name', Q.asc)],
    );
  }
}

export const userService = new UserService();
