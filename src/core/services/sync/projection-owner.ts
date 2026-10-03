export type ProjectionOwner = {
  userId: string;
  role: string;
};

export type ProjectionOwnerStorage = {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

const PROJECTION_OWNER_KEY = 'argus.sync.projection-owner';

const isProjectionOwner = (value: unknown): value is ProjectionOwner =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ProjectionOwner).userId === 'string' &&
  typeof (value as ProjectionOwner).role === 'string';

export const ownsProjection = (owner: ProjectionOwner | null, expected: ProjectionOwner): boolean =>
  owner !== null && owner.userId === expected.userId && owner.role === expected.role;

export class ProjectionOwnerStore {
  constructor(private readonly storage: ProjectionOwnerStorage) {}

  async read(): Promise<ProjectionOwner | null> {
    const stored = await this.storage.get<unknown>(PROJECTION_OWNER_KEY);
    return isProjectionOwner(stored) ? stored : null;
  }

  write(owner: ProjectionOwner): Promise<void> {
    return this.storage.set(PROJECTION_OWNER_KEY, owner);
  }

  forget(): Promise<void> {
    return this.storage.remove(PROJECTION_OWNER_KEY);
  }
}
