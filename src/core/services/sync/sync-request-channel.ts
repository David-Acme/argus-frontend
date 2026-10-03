import type {
  IAuditLogSyncResponse,
  ISynchronizedDto,
  ISynchronizedResponse,
} from '@/core/interfaces';
import type { AuditLogRequest, AuditLogScope } from '@/core/types';
import { SYNC_AUDIT_REQUEST_TYPE, SYNC_RESPONSE_TIMEOUT_MS } from '@/shared/constants';
import { SYNC_AUDIT_SCOPES, SYNC_REQUEST_TYPE } from './sync-constants';
import { errorMessage } from './sync-request-error';

type PendingRequest<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

export type SyncRequestTransport = {
  isOpen: () => boolean;
  send: (type: string, payload: unknown) => void;
  onTimeout: (reason: string) => void;
};

export class SyncRequestChannel {
  private pendingSync: PendingRequest<ISynchronizedResponse> | null = null;
  private pendingAudit = new Map<AuditLogScope, PendingRequest<IAuditLogSyncResponse>>();

  constructor(private readonly transport: SyncRequestTransport) {}

  requestSync(dto: ISynchronizedDto): Promise<ISynchronizedResponse> {
    if (!this.transport.isOpen()) return Promise.reject(new Error('Socket is not connected'));
    if (this.pendingSync) return Promise.reject(new Error('A sync request is already pending'));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingSync = null;
        reject(new Error('Synchronization response timeout'));
        this.transport.onTimeout('Synchronization response timeout');
      }, SYNC_RESPONSE_TIMEOUT_MS);
      this.pendingSync = {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      try {
        this.transport.send(SYNC_REQUEST_TYPE, dto);
      } catch (error) {
        this.rejectSync(new Error(errorMessage(error)));
      }
    });
  }

  resolveSync(response: ISynchronizedResponse): void {
    const pending = this.pendingSync;
    this.pendingSync = null;
    pending?.resolve(response ?? {});
  }

  rejectSync(error: Error): void {
    const pending = this.pendingSync;
    this.pendingSync = null;
    pending?.reject(error);
  }

  requestAudit(scope: AuditLogScope, payload: AuditLogRequest): Promise<IAuditLogSyncResponse> {
    if (!this.transport.isOpen()) return Promise.reject(new Error('Socket is not connected'));
    if (this.pendingAudit.has(scope)) {
      return Promise.reject(new Error('An audit sync request is already pending'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAudit.delete(scope);
        reject(new Error('Audit synchronization response timeout'));
        this.transport.onTimeout('Audit synchronization response timeout');
      }, SYNC_RESPONSE_TIMEOUT_MS);
      this.pendingAudit.set(scope, {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this.transport.send(SYNC_AUDIT_REQUEST_TYPE[scope], payload);
      } catch (error) {
        this.rejectAudit(scope, new Error(errorMessage(error)));
      }
    });
  }

  resolveAudit(scope: AuditLogScope, response: IAuditLogSyncResponse): void {
    const pending = this.pendingAudit.get(scope);
    this.pendingAudit.delete(scope);
    pending?.resolve(response ?? { info: [] });
  }

  rejectAudit(scope: AuditLogScope, error: Error): void {
    const pending = this.pendingAudit.get(scope);
    this.pendingAudit.delete(scope);
    pending?.reject(error);
  }

  rejectAll(error: Error): void {
    this.rejectSync(error);
    for (const scope of SYNC_AUDIT_SCOPES) this.rejectAudit(scope, error);
  }
}
