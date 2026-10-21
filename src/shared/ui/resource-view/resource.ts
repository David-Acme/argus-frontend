export type ResourceRetry = () => void | Promise<unknown>;

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'stale'; data: T; age: string; retry?: ResourceRetry }
  | { status: 'failed'; retry: ResourceRetry }
  | { status: 'refused'; owner: string };
