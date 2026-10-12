export const RESOURCE_DOMAINS = ['camera', 'guard', 'productivity', 'identity'] as const;

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
] as const;

export const RESOURCE_COALESCE_MS = 300;
