import { useCallback, useEffect, useRef, useState } from 'react';
import { inviteService } from '@/core/services/invite';
import type { InvitationPreview } from '@/features/people/components/user-options';
import { toastServiceError } from '@/shared/libs/service-error';
import { replacedInvitation } from '@/features/people/model/invitation-flight';

type InvitationPreviewOptions = {
  onRevoked: () => void;
  isSpent: (invitationId: number) => boolean;
};

type InvitationPreviewState = {
  preview: InvitationPreview | null;
  show: (preview: InvitationPreview) => void;
  dismiss: () => void;
};

export function useInvitationPreview({
  onRevoked,
  isSpent,
}: InvitationPreviewOptions): InvitationPreviewState {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const previewRef = useRef<InvitationPreview | null>(null);
  const spentRef = useRef(isSpent);

  const dismiss = useCallback(() => {
    const current = previewRef.current;
    previewRef.current = null;
    setPreview(null);
    if (!current || spentRef.current(current.invitationId)) return;
    void inviteService.revoke(current.invitationId).then((response) => {
      if (!response.ok) toastServiceError(response.errors);
      else onRevoked();
    });
  }, [onRevoked]);

  const show = useCallback((next: InvitationPreview) => {
    const replaced = replacedInvitation(previewRef.current, next, spentRef.current);
    previewRef.current = next;
    setPreview(next);
    if (replaced !== null) void inviteService.revoke(replaced);
  }, []);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    spentRef.current = isSpent;
  }, [isSpent]);

  useEffect(
    () => () => {
      const current = previewRef.current;
      if (current && !spentRef.current(current.invitationId)) {
        void inviteService.revoke(current.invitationId);
      }
    },
    []
  );

  return { preview, show, dismiss };
}
