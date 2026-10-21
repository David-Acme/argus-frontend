import { Toaster as Sonner, toast as sonner } from 'sonner';
import { feedback, inset } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ToastCard } from './toast-card';
import { cardPropsOf, planToast, type ToastInput } from './toast-policy';

const MOBILE_OFFSET = {
  bottom: inset.toast.offset,
  left: inset.toast.edge,
  right: inset.toast.edge,
};

export function Toaster() {
  const { t } = useTranslation();
  return (
    <Sonner
      position="bottom-center"
      offset={inset.toast.edge}
      mobileOffset={MOBILE_OFFSET}
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
