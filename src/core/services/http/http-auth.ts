import type { IHttpAuthBridge } from '@/core/interfaces';

/**
 * Registration point that keeps http.service decoupled from session.service:
 * importing the session directly closes an import cycle through the domain
 * services. The session registers its credential hooks here at load.
 */
let bridge: IHttpAuthBridge | null = null;

export function registerHttpAuth(next: IHttpAuthBridge): void {
  bridge = next;
}

export function httpAuth(): IHttpAuthBridge {
  if (!bridge) {
    throw new Error('http-auth: not registered yet; session.service must load first');
  }
  return bridge;
}
