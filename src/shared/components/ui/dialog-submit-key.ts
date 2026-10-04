type SubmitKeyTarget = {
  tagName?: string;
  getAttribute?: (name: string) => string | null;
};

type SubmitKeyEvent = {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  target: unknown;
};

const ACTIVATING_ROLES = new Set([
  'button',
  'link',
  'switch',
  'checkbox',
  'radio',
  'menuitem',
  'tab',
  'combobox',
  'option',
]);

const ACTIVATING_TAGS = new Set(['BUTTON', 'A', 'SELECT']);

function asTarget(target: unknown): SubmitKeyTarget {
  return typeof target === 'object' && target !== null ? (target as SubmitKeyTarget) : {};
}

export function submitsDialog(event: SubmitKeyEvent): boolean {
  if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return false;
  if (event.shiftKey || event.altKey) return false;
  const target = asTarget(event.target);
  const tag = target.tagName?.toUpperCase() ?? '';
  if (tag === 'TEXTAREA') return event.ctrlKey || event.metaKey;
  if (ACTIVATING_TAGS.has(tag)) return false;
  const role = target.getAttribute?.('role') ?? null;
  if (role && ACTIVATING_ROLES.has(role)) return false;
  return true;
}
