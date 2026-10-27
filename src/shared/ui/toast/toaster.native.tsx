import { View } from 'react-native';
import { Toaster as Sonner, toast as sonner } from 'sonner-native';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import { feedback } from '@/shared/theme';
import { ToastCard } from './toast-card';
import { cardPropsOf, planToast, type ToastInput } from './toast-policy';

export function Toaster() {
  const { toast: offset } = useNavOffsets();
  return <Sonner position="bottom-center" offset={offset} />;
}

function show(input: ToastInput): string | number {
  const plan = planToast(input);
  if (plan.haptic) feedback(plan.haptic);
  const action = plan.action;
  const id = plan.id ?? `argus-${Date.now()}`;
  return sonner.custom(
    <View className="px-toast-edge self-stretch">
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
    </View>,
    { id, duration: plan.duration }
  );
}

function dismiss(id?: string | number): void {
  sonner.dismiss(id);
}

export const toast = { show, dismiss };
