import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { UserModel } from '@/core/database';
import { DatabaseService } from './database.service';
import { wordClauses, type PageSegment } from './paging';
import { SEARCH_PAGE_SIZE } from '@/shared/constants';

class UserService extends DatabaseService<'user'> {
  constructor() {
    super('user');
  }

  searchActive(words: readonly string[]): PageSegment<UserModel> {
    return this.keysetSegment({
      clauses: [Q.where('is_active', true), ...wordClauses(['name', 'last_name'], words)],
      sort: { column: 'created_at', order: 'asc' },
      columns: ['name', 'last_name', 'is_active'],
      pageSize: SEARCH_PAGE_SIZE,
    });
  }

  observeDirectory(): Observable<UserModel[]> {
    return this.observeManyWithColumns(
      ['name', 'last_name', 'role', 'is_active', 'created_at', 'updated_at'],
      [Q.sortBy('name', Q.asc)],
    );
  }
}

export const userService = new UserService();
