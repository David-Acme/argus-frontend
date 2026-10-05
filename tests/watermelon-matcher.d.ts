declare module '@nozbe/watermelondb/observation/encodeMatcher' {
  import type { QueryDescription } from '@nozbe/watermelondb/QueryDescription';

  export default function encodeMatcher(query: QueryDescription): (raw: object) => boolean;
}
