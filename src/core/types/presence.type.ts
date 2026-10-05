export type PresenceState = 'home' | 'away' | 'unknown';

export interface EnvironmentPresence {
  environmentId: number;
  state: PresenceState;
  since: number;
}

export interface PersonPresence {
  userId: number;
  state: PresenceState;
  since: number;
  environments: EnvironmentPresence[];
}

export interface PresenceOverview {
  people: PersonPresence[];
}
