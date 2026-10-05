import { Q, type Collection } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { map } from 'rxjs/operators';
import { combineLatest, type Observable } from 'rxjs';
import { collection, database } from '@/core/database';
import type { KeysetPage, KeysetSort, KeysetWindow, ModelOf, TableName } from '@/core/types';
import { cursorOf, keysetAfter, keysetOrder, keysetThrough } from './paging/keyset';

export type KeysetQuery = {
  clauses: Clause[];
  sort: KeysetSort;
  columns: string[];
  pageSize: number;
};

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

  protected observeKeysetPage(
    query: KeysetQuery,
    window: KeysetWindow,
  ): Observable<KeysetPage<ModelOf<K>>> {
    const order = keysetOrder(query.sort);
    const through = window.through;
    if (!through) {
      return this.collection
        .query(...query.clauses, ...order, Q.take(query.pageSize + 1))
        .observeWithColumns(query.columns)
        .pipe(
          map((rows) => ({
            rows: rows.slice(0, query.pageSize),
            hasMore: rows.length > query.pageSize,
          })),
        );
    }
    const rows = this.collection
      .query(...query.clauses, keysetThrough(query.sort, through), ...order)
      .observeWithColumns(query.columns);
    const beyond = this.collection
      .query(...query.clauses, keysetAfter(query.sort, through), ...order, Q.take(1))
      .observe();
    return combineLatest([rows, beyond]).pipe(
      map(([page, next]) => ({ rows: page, hasMore: next.length > 0 })),
    );
  }

  protected async nextKeysetWindow(
    query: KeysetQuery,
    window: KeysetWindow,
  ): Promise<KeysetWindow> {
    const order = keysetOrder(query.sort);
    const through = window.through;
    const rows = through
      ? await this.fetchMany([
          ...query.clauses,
          keysetAfter(query.sort, through),
          ...order,
          Q.take(query.pageSize),
        ])
      : await this.fetchMany([...query.clauses, ...order, Q.take(query.pageSize * 2)]);
    const reach = through ? rows : rows.slice(query.pageSize);
    const last = reach[reach.length - 1];
    if (!last) return window;
    return { through: cursorOf(last, query.sort) ?? through };
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
