export const ASSISTANT_TARGET = 'assistant';

export const CHECKLIST_TARGETS: Readonly<Record<string, string>> = {
  guard: '/security',
  security: '/security',
  voice: ASSISTANT_TARGET,
  call: ASSISTANT_TARGET,
  assistant: ASSISTANT_TARGET,
  cameras: '/cameras',
  agenda: '/agenda',
  projects: '/projects',
  users: '/users',
  people: '/people',
  'settings/modules': '/settings/modules',
};

export function checklistDestinationKey(destination: string): string {
  const path = destination.trim().split(/[?#]/)[0] ?? '';
  return path.replace(/^\/+|\/+$/g, '').toLowerCase();
}

export function checklistTarget(destination: string | null, assistantHref: string | null): string | null {
  if (!destination) return null;
  const target = CHECKLIST_TARGETS[checklistDestinationKey(destination)];
  if (target === undefined) return null;
  return target === ASSISTANT_TARGET ? assistantHref : target;
}
