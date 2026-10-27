import { useState } from 'react';
import type { ConfirmProps } from '@/shared/ui/confirm';

export type AskRequest = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
  run: () => Promise<unknown>;
};

export type Ask = {
  ask: (request: AskRequest) => void;
  confirm: ConfirmProps;
};

export function useAsk(): Ask {
  const [request, setRequest] = useState<AskRequest | null>(null);
  const close = () => setRequest(null);
  return {
    ask: setRequest,
    confirm: {
      open: request !== null,
      title: request?.title ?? '',
      body: request?.body ?? '',
      confirmLabel: request?.confirmLabel ?? '',
      variant: request?.destructive ? 'destructive' : 'default',
      onConfirm: () => {
        const run = request?.run;
        close();
        return run?.();
      },
      onCancel: close,
    },
  };
}
