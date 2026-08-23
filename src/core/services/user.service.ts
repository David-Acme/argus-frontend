import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { UserModel } from '@/core/database';
import type { IPeopleDirectoryFilter } from '@/core/interfaces';
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

  observeDirectory(): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'role', 'is_active', 'created_at'],
      [Q.sortBy('name', Q.asc)],
    );
  }

  observeByRole(role: UserRole): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'is_active'],
      [Q.where('role', role), Q.sortBy('name', Q.asc)],
    );
  }

  /** Filter queries stay in the database layer; screens receive only snapshots. */
  async filterDirectory(filter: IPeopleDirectoryFilter): Promise<UserModel[]> {
    const users = await this.fetchMany([Q.sortBy('name', Q.asc)]);
    const query = filter.query.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesRole = filter.role === 'all' || user.role === filter.role;
      const fullName = `${user.name} ${user.lastName}`.toLocaleLowerCase();
      return matchesRole && (!query || fullName.includes(query) || user.role.includes(query));
    });
  }
}

export const userService = new UserService();
