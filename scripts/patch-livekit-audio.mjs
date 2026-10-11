import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const setup = join(
  root,
  'node_modules',
  '@livekit',
  'react-native',
  'android',
  'src',
  'main',
  'java',
  'com',
  'livekit',
  'reactnative',
  'LiveKitReactNative.kt',
);
const hardware = 'val useHardwareAudioProcessing = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q';
const software = 'val useHardwareAudioProcessing = false';

if (!existsSync(setup)) process.exit(0);

const source = readFileSync(setup, 'utf8');
if (!source.includes(software)) {
  if (!source.includes(hardware)) throw new Error('livekit audio patch anchor not found: LiveKitReactNative.kt');
  writeFileSync(setup, source.replace(hardware, software));
}
console.log('livekit android audio uses the WebRTC software echo canceller');
