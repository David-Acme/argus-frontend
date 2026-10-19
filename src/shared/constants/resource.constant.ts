export const RESOURCE_DOMAINS = ['camera', 'guard', 'productivity', 'identity', 'settings', 'activity'] as const;

export const RESOURCE_SCOPES = [
  'device',
  'zones',
  'status',
  'overview',
  'environments',
  'incidents',
  'episodes',
  'expected_visits',
  'responses',
  'safety_pin',
  'duress',
  'projects',
  'calendar',
  'privacy_household',
  'privacy_choice',
  'visitors',
  'values',
  'voiceprints',
  'presence',
  'entries',
  'clips',
  'recording',
  'aim',
  'maintenance',
] as const;

export const RESOURCE_COALESCE_MS = 300;
