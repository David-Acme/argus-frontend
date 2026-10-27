import type { TextInputProps } from 'react-native';

export type TextContent =
  'plain' | 'name' | 'given' | 'family' | 'email' | 'url' | 'number' | 'code' | 'address';

export type SecretContent = 'password' | 'pin';

export type FieldSubmit = { key: 'next' | 'done'; onSubmit: () => void };

export type InputTraits = Pick<
  TextInputProps,
  | 'inputMode'
  | 'autoComplete'
  | 'textContentType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'secureTextEntry'
>;

const LITERAL: InputTraits = { autoCapitalize: 'none', autoCorrect: false };

export const TEXT_TRAITS: Record<TextContent, InputTraits> = {
  plain: { autoCapitalize: 'sentences' },
  name: { autoComplete: 'name', textContentType: 'name', autoCapitalize: 'words' },
  given: { autoComplete: 'given-name', textContentType: 'givenName', autoCapitalize: 'words' },
  family: { autoComplete: 'family-name', textContentType: 'familyName', autoCapitalize: 'words' },
  email: {
    ...LITERAL,
    inputMode: 'email',
    autoComplete: 'email',
    textContentType: 'emailAddress',
  },
  url: { ...LITERAL, inputMode: 'url', autoComplete: 'url', textContentType: 'URL' },
  number: { ...LITERAL, inputMode: 'numeric', autoComplete: 'off' },
  code: { ...LITERAL, autoCapitalize: 'characters', autoComplete: 'off' },
  address: { ...LITERAL, inputMode: 'url', autoComplete: 'off' },
};

export const SECRET_TRAITS: Record<SecretContent, InputTraits> = {
  password: {
    ...LITERAL,
    secureTextEntry: true,
    autoComplete: 'current-password',
    textContentType: 'password',
  },
  pin: {
    ...LITERAL,
    secureTextEntry: true,
    inputMode: 'numeric',
    autoComplete: 'off',
    textContentType: 'none',
  },
};

export const CODE_TRAITS: InputTraits = {
  autoCapitalize: 'characters',
  autoCorrect: false,
  inputMode: 'text',
  autoComplete: 'one-time-code',
  textContentType: 'oneTimeCode',
};

export function submitTraits(submit: FieldSubmit | undefined): Partial<TextInputProps> {
  if (!submit) return {};
  return {
    enterKeyHint: submit.key,
    submitBehavior: submit.key === 'next' ? 'submit' : 'blurAndSubmit',
    onSubmitEditing: submit.onSubmit,
  };
}
