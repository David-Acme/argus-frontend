export type QrPairingTxt = {
  path?: string;
  https?: string;
  wss?: string;
};

export type QrPairingPayload = {
  host: string;
  port: number;
  scheme: string;
  code: string;
  instanceId: string;
  caFingerprint: string;
  serverFingerprint: string;
  serviceType?: string;
  txt?: QrPairingTxt;
};