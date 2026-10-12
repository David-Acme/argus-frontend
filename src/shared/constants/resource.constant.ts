export const RESOURCE_DOMAINS = ['camera', 'guard', 'productivity', 'identity', 'settings'] as const;

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
] as const;

export const RESOURCE_COALESCE_MS = 300;
