import type { ShimSeed } from './tauri-shim';
import { OWNER } from './fake-argus';

export const ownerDevice = (device: string): ShimSeed => ({
  device,
  secure: {
    'net.paired': 'true',
    'net.caPem': 'e2e-ca',
    'net.caFingerprint': 'e2e-fingerprint',
    'net.host': 'argus.e2e',
    'net.ip': '127.0.0.1',
    'net.port': '7042',
    'net.instanceId': 'e2e-instance',
    'net.pairedAt': '1',
    'net.routes': '{}',
    'net.accessToken': `access-${device}`,
    'net.refreshToken': `refresh-${device}`,
    'net.deviceCredential': `credential-${device}`,
  },
  local: {
    'argus-storage:app.session.user': JSON.stringify(OWNER),
  },
});

export const unpairedDevice = (device: string): ShimSeed => ({ device, secure: {}, local: {} });
