import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { IServiceResponse } from '@/core/interfaces';
import { IS_WEB } from '@/shared/constants';
import type { useFormScroll } from '@/shared/components/ui/form';
import type { OptimisticIntentInput } from '@/shared/libs/optimistic';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { toastServiceError } from '@/shared/libs/service-error';

type OptimisticSubmit = {
  intents: readonly OptimisticIntentInput<object>[];
  success?: string;
  errorTitle?: string;
};

type UseFormSubmitOptions<TValues extends FieldValues, TResult> = {
  form: UseFormReturn<TValues>;
  formScroll?: ReturnType<typeof useFormScroll>;
  request: (values: TValues) => Promise<IServiceResponse<TResult>>;
  onSuccess?: (info: TResult | null) => void;
  optimistic?: (values: TValues) => OptimisticSubmit;
};

type UseFormSubmitResult = {
  submitting: boolean;
  submit: () => Promise<void>;
};

export function useFormSubmit<TValues extends FieldValues, TResult>({
  form,
  formScroll,
  request,
  onSuccess,
  optimistic,
}: UseFormSubmitOptions<TValues, TResult>): UseFormSubmitResult {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      formScroll?.scrollToFirstError(form as unknown as UseFormReturn<FieldValues>);
      return;
    }

    if (!IS_WEB) Keyboard.dismiss();
    const values = form.getValues();

    if (optimistic) {
      const plan = optimistic(values);
      onSuccess?.(null);
      await runOptimistic({ ...plan, call: () => request(values) });
      return;
    }

    setSubmitting(true);
    try {
      const response = await request(values);
      if (response.ok) {
        onSuccess?.(response.info);
        return;
      }

      const fields = Object.fromEntries(
        Object.entries(response.errors?.fields ?? {}).filter(([name]) => name in form.getValues()),
      );
      if (Object.keys(fields).length > 0) {
        for (const [name, messages] of Object.entries(fields)) {
          form.setError(name as Path<TValues>, { message: messages[0] });
        }
        formScroll?.scrollToFirstError(form as unknown as UseFormReturn<FieldValues>);
        return;
      }

      toastServiceError(response.errors);
    } finally {
      setSubmitting(false);
    }
  }, [form, formScroll, onSuccess, optimistic, request]);

  return { submitting, submit };
}
