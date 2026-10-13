import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { cdpEndpoint } from './support/chromium';

export default {
  projectId: 'argus-frontend',
  tests: ['**/*.e2e.ts'],
  workers: 1,
  retries: 0,
  timeout: 120000,
  output: '.e2e',
  cache: 'off',
  targets: [
    {
      name: 'desktop-web',
      engine: web({ connect: { cdpEndpoint }, viewport: { width: 1280, height: 800 } }),
      app: {
        url: 'http://127.0.0.1:0',
        command: {
          executable: 'bun',
          args: ['support/serve.ts', '--port', '{port}'],
          log: '.e2e/serve.log',
        },
        readyUrl: 'http://127.0.0.1:{port}/__e2e/health',
      },
    },
  ],
} satisfies E2EConfig;
