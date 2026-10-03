export interface IArgusSocket {
  sendText(message: string): void;
  sendBinary(data: ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  onOpen: (() => void) | null;
  onMessage: ((message: string | null, data: ArrayBuffer | null) => void) | null;
  onError: ((code: string, message: string) => void) | null;
  onClose: ((code: number, reason: string) => void) | null;
}
