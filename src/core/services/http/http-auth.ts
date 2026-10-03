import type { IHttpAuthBridge } from '@/core/interfaces';

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
