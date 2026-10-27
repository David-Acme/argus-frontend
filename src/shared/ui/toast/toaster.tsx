import { Toaster as Sonner, toast as sonner } from 'sonner';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback, inset } from '@/shared/theme';
import { ToastCard } from './toast-card';
import { cardPropsOf, planToast, type ToastInput } from './toast-policy';

export function Toaster() {
  const { t } = useTranslation();
  const { toast: bottom } = useNavOffsets();
  const mobileOffset = { bottom, left: inset.toast.edge, right: inset.toast.edge };
  return (
    <Sonner
      position="bottom-center"
      offset={inset.toast.edge}
      mobileOffset={mobileOffset}
      containerAriaLabel={t('common.overlay.toasts')}
      toastOptions={{ unstyled: true }}
    />
  );
}

function show(input: ToastInput): string | number {
  const plan = planToast(input);
  if (plan.haptic) feedback(plan.haptic);
  const action = plan.action;
  return sonner.custom(
    (id) => (
      <ToastCard
        {...cardPropsOf(input)}
        onAction={
          action
            ? () => {
                sonner.dismiss(id);
                action();
              }
            : undefined
        }
      />
    ),
    { id: plan.id, duration: plan.duration }
  );
}

function dismiss(id?: string | number): void {
  sonner.dismiss(id);
}

export const toast = { show, dismiss };
