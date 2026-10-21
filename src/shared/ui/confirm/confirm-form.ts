export type ConfirmForm = 'alert' | 'dialog';

export type ConfirmFormInput = { compact: boolean; destructive: boolean; android: boolean };

export function confirmForm({ compact, destructive, android }: ConfirmFormInput): ConfirmForm {
  if (!compact) return 'dialog';
  if (destructive && android) return 'dialog';
  return 'alert';
}
