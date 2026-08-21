import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { IServiceResponse } from '@/core/interfaces';
import { IS_WEB } from '@/shared/constants';
import type { useFormScroll } from '@/shared/components/ui/form';
import { toast } from '@/shared/libs/toast';
import { useTranslation } from './use-translation';

type UseFormSubmitOptions<TValues extends FieldValues, TResult> = {
  form: UseFormReturn<TValues>;
  formScroll?: ReturnType<typeof useFormScroll>;
  /** The write itself. Receives the validated values. */
  request: (values: TValues) => Promise<IServiceResponse<TResult>>;
  onSuccess?: (info: TResult | null) => void;
};

type UseFormSubmitResult = {
  submitting: boolean;
  submit: () => Promise<void>;
};


const ERROR_KEY: Record<string, string> = {
  NETWORK_ERROR: 'common.errors.network',
  TIMEOUT: 'common.errors.timeout',
  UNAUTHORIZED: 'common.errors.unauthorized',
  FORBIDDEN: 'common.errors.forbidden',
  NOT_FOUND: 'common.errors.not-found',
  CONFLICT: 'common.errors.conflict',
  VALIDATION_ERROR: 'common.errors.validation',
  PAIRING_REQUIRED: 'common.errors.pairing-required',
};

/**
 * Validate, write, and turn the answer into field errors or a toast. The
 * backend returns `errors.fields` keyed by field name, so a 422 lands under the
 * input that caused it.
 */
export function useFormSubmit<TValues extends FieldValues, TResult>({
  form,
  formScroll,
  request,
  onSuccess,
}: UseFormSubmitOptions<TValues, TResult>): UseFormSubmitResult {
  const { tk } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      formScroll?.scrollToFirstError(form as unknown as UseFormReturn<FieldValues>);
      return;
    }

    if (!IS_WEB) Keyboard.dismiss();
    setSubmitting(true);
    try {
      const response = await request(form.getValues());
      if (response.ok) {
        onSuccess?.(response.info);
        return;
      }

      const fields = response.errors?.fields;
      if (fields && Object.keys(fields).length > 0) {
        for (const [name, messages] of Object.entries(fields)) {
          form.setError(name as Path<TValues>, { message: messages[0] });
        }
        formScroll?.scrollToFirstError(form as unknown as UseFormReturn<FieldValues>);
        return;
      }

      const code = response.errors?.code ?? 'UNKNOWN';
      toast.error(tk(ERROR_KEY[code] ?? 'common.errors.unknown'), response.errors?.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, formScroll, onSuccess, request, tk]);

  return { submitting, submit };
}
