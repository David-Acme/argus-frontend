import { useCallback, useEffect, useRef, useState } from 'react';
import { inviteService } from '@/core/services/invite';
import type { InvitationPreview } from '@/features/people/components/user-options';
import { toastServiceError } from '@/shared/libs/service-error';

type InvitationPreviewState = {
  preview: InvitationPreview | null;
  show: (preview: InvitationPreview) => void;
  dismiss: () => void;
};

export function useInvitationPreview(onRevoked: () => void): InvitationPreviewState {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const previewRef = useRef<InvitationPreview | null>(null);

  const dismiss = useCallback(() => {
    const current = previewRef.current;
    previewRef.current = null;
    setPreview(null);
    if (!current) return;
    void inviteService.revoke(current.invitationId).then((response) => {
      if (!response.ok) toastServiceError(response.errors);
      else onRevoked();
    });
  }, [onRevoked]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(
    () => () => {
      const current = previewRef.current;
      if (current) void inviteService.revoke(current.invitationId);
    },
    [],
  );

  return { preview, show: setPreview, dismiss };
}
