export type ResponseKind = 'guard_episode' | 'guard_panic' | 'guard_duress' | 'guard_tamper';

export type ResponseStrategy = 'ordered' | 'inside_first' | 'everyone' | 'night_quiet';

export type ResponseState = 'active' | 'attended' | 'unanswered' | 'confirmed' | 'false_alarm' | 'expired';

export type ResponseVerdict = 'real' | 'false_alarm';

export type ResponseOffer = 'camera' | 'siren';

export type ResponsePerson = { userId: number; name: string };

export type ResponseContact = { name: string; phone: string; note: string };

export type ResponseMine = {
  step: number;
  mode: 'call' | 'notify';
  mandatory: boolean;
  discreet: boolean;
  reached: boolean;
};

export interface IncidentResponse {
  id: number;
  threadKey: string;
  kind: ResponseKind;
  environmentId: number;
  environmentName: string;
  cameraId: number;
  cameraName: string;
  episodeId: number;
  strategy: ResponseStrategy;
  state: ResponseState;
  step: number;
  stepCount: number;
  attendedBy: ResponsePerson | null;
  verdict: ResponseVerdict | '';
  verdictBy: ResponsePerson | null;
  verdictAt: number;
  emergencyNumber: string;
  contacts: ResponseContact[];
  showContacts: boolean;
  offers: string[];
  createdAt: number;
  updatedAt: number;
  mine: ResponseMine | null;
}

export type RecipientMode = 'call' | 'notify' | 'off';

export interface ResponseRecipient {
  userId: number;
  name: string;
  role: 'owner' | 'resident' | 'guard' | 'guest';
  mode: RecipientMode;
  step: number;
  onDuty: boolean;
  customized: boolean;
  mandatory: boolean;
}

export interface ResponseContactEntry extends ResponseContact {
  id: number;
}

export interface EnvironmentResponseConfig {
  environmentId: number;
  emergencyNumber: string;
  stepSeconds: number;
  staffedNow: boolean;
  recipients: ResponseRecipient[];
  contacts: ResponseContactEntry[];
}

export type EnvironmentResponseUpdate = {
  emergencyNumber: string;
  stepSeconds: number;
  recipients: { userId: number; mode: RecipientMode; step: number; onDuty: boolean }[];
  contacts: ResponseContact[];
};
