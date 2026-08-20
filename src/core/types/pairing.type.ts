/** TXT records announced via mDNS (informational; the secret lives in the QR). */
export type QrPairingTxt = {
  path?: string;
  https?: string;
  wss?: string;
};

/** Server banner QR payload (`printPairingBanner` in application.cc). */
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