import type {
  IAuditLogSyncResponse,
  IInitialInfo,
  ISocketEmitDto,
  ISynchronizedResponse,
  IWsMessage,
} from '@/core/interfaces';
import type { AuditLogScope, SyncOperation } from '@/core/types';
import { SYNC_AUDIT_REQUEST_TYPE, SYNC_OPERATION, VOICE_ERROR_TYPE } from '@/shared/constants';
import { SYNC_ERROR_SUFFIX, SYNC_REQUEST_TYPE, SYNC_VOICE_PREFIX } from './sync-constants';
import { SyncRequestError } from './sync-request-error';

export type SyncErrorFrame = Partial<IWsMessage> & { status?: unknown };

export type SyncFrameHandlers = {
  initialInfo: (info: IInitialInfo) => void;
  syncResponse: (response: ISynchronizedResponse) => void;
  syncFailure: (error: Error) => void;
  auditResponse: (scope: AuditLogScope, response: IAuditLogSyncResponse) => void;
  auditFailure: (scope: AuditLogScope, error: Error) => void;
  liveFrame: (frame: ISocketEmitDto) => void;
  authContextChanged: (info: unknown) => void;
};

export const auditScopeOfRequest = (requestType: string): AuditLogScope | null => {
  if (requestType === SYNC_AUDIT_REQUEST_TYPE.global) return 'global';
  if (requestType === SYNC_AUDIT_REQUEST_TYPE.user) return 'user';
  return null;
};

export const readErrorFrame = (
  type: string,
  frame: SyncErrorFrame
): { requestType: string; status: number; message: string } => {
  const requestType = type.slice(0, -SYNC_ERROR_SUFFIX.length);
  const status = Number(frame.status) || 0;
  const message =
    typeof frame.error === 'string'
      ? frame.error
      : typeof frame.payload === 'string'
        ? frame.payload
        : `Socket error: ${type}`;
  return { requestType, status, message };
};

export class SyncMessageRouter {
  private listeners = new Map<number, Set<(msg: ISocketEmitDto) => void>>();
  private typeListeners = new Map<string, Set<(payload: unknown) => void>>();
  private binaryListeners = new Set<(data: ArrayBuffer) => void>();

  constructor(private readonly handlers: SyncFrameHandlers) {}

  on(operation: SyncOperation, listener: (msg: ISocketEmitDto) => void): () => void {
    const set = this.listeners.get(operation) ?? new Set();
    set.add(listener);
    this.listeners.set(operation, set);
    return () => set.delete(listener);
  }

  onType(type: string, listener: (payload: unknown) => void): () => void {
    const set = this.typeListeners.get(type) ?? new Set();
    set.add(listener);
    this.typeListeners.set(type, set);
    return () => set.delete(listener);
  }

  onBinary(listener: (data: ArrayBuffer) => void): () => void {
    this.binaryListeners.add(listener);
    return () => this.binaryListeners.delete(listener);
  }

  routeBinary(data: ArrayBuffer): void {
    this.binaryListeners.forEach((cb) => cb(data));
  }

  route(raw: string): void {
    let msg: Partial<ISocketEmitDto> & SyncErrorFrame;
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (typeof msg.type === 'string' && msg.type.endsWith(SYNC_ERROR_SUFFIX)) {
      this.routeError(msg.type, msg);
      return;
    }

    if (msg.type) {
      this.typeListeners.get(msg.type)?.forEach((fn) => fn(msg.payload));
      return;
    }

    const operation = Number(msg.operation);
    if (!Number.isInteger(operation)) return;

    const emit = msg as ISocketEmitDto;
    this.listeners.get(operation)?.forEach((fn) => fn(emit));
    switch (operation) {
      case SYNC_OPERATION.InitialInfo:
        this.handlers.initialInfo(emit.info as IInitialInfo);
        break;
      case SYNC_OPERATION.Synchronize:
        this.handlers.syncResponse(emit.info as ISynchronizedResponse);
        break;
      case SYNC_OPERATION.SynchronizeAuditLog:
        this.handlers.auditResponse('global', emit.info as IAuditLogSyncResponse);
        break;
      case SYNC_OPERATION.SynchronizeUserAuditLog:
        this.handlers.auditResponse('user', emit.info as IAuditLogSyncResponse);
        break;
      case SYNC_OPERATION.Add:
      case SYNC_OPERATION.Delete:
      case SYNC_OPERATION.Log:
        this.handlers.liveFrame(emit);
        break;
      case SYNC_OPERATION.AuthContextChanged:
        this.handlers.authContextChanged(emit.info);
        break;
    }
  }

  private routeError(type: string, frame: SyncErrorFrame): void {
    const { requestType, status, message } = readErrorFrame(type, frame);

    if (requestType === SYNC_REQUEST_TYPE) {
      this.handlers.syncFailure(new SyncRequestError(message, status));
      return;
    }
    const scope = auditScopeOfRequest(requestType);
    if (scope) {
      this.handlers.auditFailure(scope, new SyncRequestError(message, status));
      return;
    }
    const payload = { status, error: message };
    this.typeListeners.get(type)?.forEach((fn) => fn(payload));
    if (requestType.startsWith(SYNC_VOICE_PREFIX)) {
      this.typeListeners.get(VOICE_ERROR_TYPE)?.forEach((fn) => fn(payload));
    }
  }
}
