import { Q, type Collection } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { map } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import { collection, database } from '@/core/database';
import type { ModelOf, TableName } from '@/core/types';

export abstract class DatabaseService<K extends TableName> {
  protected readonly table: K;

  constructor(table: K) {
    this.table = table;
  }

  protected get collection(): Collection<ModelOf<K>> {
    return collection(this.table);
  }

  protected observeMany(clauses: Clause[] = []): Observable<ModelOf<K>[]> {
    return this.collection.query(...clauses).observe();
  }

  protected observeManyWithColumns(
    columns: string[],
    clauses: Clause[] = [],
  ): Observable<ModelOf<K>[]> {
    return this.collection.query(...clauses).observeWithColumns(columns);
  }

  protected observeTotal(clauses: Clause[] = []): Observable<number> {
    return this.collection.query(...clauses).observeCount();
  }

  protected fetchMany(clauses: Clause[] = []): Promise<ModelOf<K>[]> {
    return this.collection.query(...clauses).fetch();
  }

  protected fetchTotal(clauses: Clause[] = []): Promise<number> {
    return this.collection.query(...clauses).fetchCount();
  }

  protected write<T>(work: () => Promise<T>): Promise<T> {
    return database.write(work);
  }

  observeAll(): Observable<ModelOf<K>[]> {
    return this.observeMany();
  }

  observeById(id: string): Observable<ModelOf<K> | null> {
    return this.collection
      .query(Q.where('id', id))
      .observe()
      .pipe(map((records) => records[0] ?? null));
  }

  observeCount(): Observable<number> {
    return this.observeTotal();
  }

  async findById(id: string): Promise<ModelOf<K> | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }
}
