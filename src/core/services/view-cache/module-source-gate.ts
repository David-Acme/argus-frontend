import { BehaviorSubject, of, type Observable } from 'rxjs';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';

const sameSet = (left: ReadonlySet<string> | null, right: ReadonlySet<string> | null): boolean =>
  left === right || (left !== null && right !== null && left.size === right.size && [...left].every((id) => right.has(id)));

export class ModuleSourceGate {
  private readonly active = new BehaviorSubject<ReadonlySet<string> | null>(null);

  set(ids: ReadonlySet<string> | null): void {
    if (!sameSet(this.active.value, ids)) this.active.next(ids);
  }

  of<T>(moduleId: string, source: Observable<T>, empty: T): Observable<T> {
    return this.active.pipe(
      map((ids) => ids === null || ids.has(moduleId)),
      distinctUntilChanged(),
      switchMap((on) => (on ? source : of(empty)))
    );
  }
}
