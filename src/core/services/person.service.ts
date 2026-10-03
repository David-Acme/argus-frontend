import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { PersonModel } from '@/core/database';
import { DatabaseService } from './database.service';

class PersonService extends DatabaseService<'person'> {
  constructor() {
    super('person');
  }

  observeRecent(limit = 20): Observable<PersonModel[]> {
    return this.observeManyWithColumns(
      ['name', 'alias', 'last_seen_at'],
      [Q.sortBy('last_seen_at', Q.desc), Q.take(limit)],
    );
  }

  observeKnown(): Observable<PersonModel[]> {
    return this.observeManyWithColumns(
      ['name', 'alias', 'last_seen_at'],
      [Q.where('name', Q.notEq('')), Q.sortBy('last_seen_at', Q.desc)],
    );
  }
}

export const personService = new PersonService();
