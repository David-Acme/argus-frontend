import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { UserModel } from '@/core/database';
import type { UserRole } from '@/core/types';
import { DatabaseService } from './database.service';

class UserService extends DatabaseService<'user'> {
  constructor() {
    super('user');
  }

  observeActive(): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'role'],
      [Q.where('is_active', true), Q.sortBy('name', Q.asc)],
    );
  }

  observeByRole(role: UserRole): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'is_active'],
      [Q.where('role', role), Q.sortBy('name', Q.asc)],
    );
  }
}

export const userService = new UserService();
