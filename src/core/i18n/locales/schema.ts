import type { es } from './es';

type EsLiteral = typeof es;

/** Widens literal leaves to `string` keeping the exact key shape. */
type WidenDeep<T> = T extends Record<string, unknown>
  ? { [K in keyof T]: WidenDeep<T[K]> }
  : string;

/** Shape every locale must satisfy (enforced on the registry via `satisfies`). */
export type I18nSchema = WidenDeep<EsLiteral>;

type FlattenKey<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? FlattenKey<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

/** Full dotted path of any translation, derived from the `es` dictionary. */
export type TranslationKey = FlattenKey<EsLiteral>;

type ValueAt<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? ValueAt<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

type InterpolationParams<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? { [K in Name | keyof InterpolationParams<Rest>]: string | number }
  : Record<never, never>;

/** Per-key interpolation params, extracted from the `es` literals. */
export type TranslationParamsOf<K extends TranslationKey> = InterpolationParams<
  ValueAt<EsLiteral, K>
>;

/** Rest-tuple so keys without placeholders reject params and keys with them require them. */
export type TranslationParamsRest<P> = keyof P extends never ? [] : [params: P];

export type TranslateFn = <K extends TranslationKey>(
  key: K,
  ...rest: TranslationParamsRest<TranslationParamsOf<K>>
) => string;
