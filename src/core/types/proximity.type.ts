export type BeaconStartConfig = {
  seed: string;
  rotateSeconds: number;
  title: string;
  detail: string;
};

export type ProximityBle = {
  enabled: boolean;
  seed: string | null;
  rotateSeconds: number;
  receivers: number;
};

export type ProximityMe = {
  ble: ProximityBle;
  located: boolean;
};

export const PROXIMITY_RECEIVER_KINDS = ['esphome'] as const;

export type ProximityReceiverKind = (typeof PROXIMITY_RECEIVER_KINDS)[number];

export type ProximityReceiver = {
  id: string;
  name: string;
  room: string;
  kind: ProximityReceiverKind;
  host: string;
  port: number;
  online: boolean;
  lastSeenAt: number | null;
};

export const PROXIMITY_SENSOR_MODELS = ['ld2410', 'ld2450', 'fp2'] as const;

export type ProximitySensorModel = (typeof PROXIMITY_SENSOR_MODELS)[number];

export const PROXIMITY_SENSOR_SOURCES = ['esphome', 'home_assistant'] as const;

export type ProximitySensorSource = (typeof PROXIMITY_SENSOR_SOURCES)[number];

export type ProximitySensor = {
  id: string;
  name: string;
  room: string;
  model: ProximitySensorModel;
  source: ProximitySensorSource;
  host: string;
  port: number;
  entityId: string;
  cameraId: string | null;
  panOffsetDeg: number | null;
  online: boolean;
  lastSeenAt: number | null;
};

export type ProximityReceiverInput = {
  name: string;
  room: string;
  kind: ProximityReceiverKind;
  host: string;
  port: number;
};

export type ProximitySensorInput = {
  name: string;
  room: string;
  model: ProximitySensorModel;
  source: ProximitySensorSource;
  host: string;
  port: number;
  entityId: string;
  cameraId: number | null;
  panOffsetDeg: number | null;
};

export const PROXIMITY_EVIDENCE_KINDS = ['face', 'radarBox', 'voice', 'ble'] as const;

export type ProximityEvidence = (typeof PROXIMITY_EVIDENCE_KINDS)[number];

export type ProximityPerson = {
  userId: string;
  room: string;
  confidence: number;
  since: number;
  updatedAt: number;
  evidence: ProximityEvidence;
};
