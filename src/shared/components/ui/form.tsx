import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { View, type ScrollView, type ViewProps } from 'react-native';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { Text } from './text';

const Form = FormProvider;

type FormFieldContextValue = { name: string };

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  const value = useMemo(() => ({ name: props.name }), [props.name]);
  return (
    <FormFieldContext.Provider value={value}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = { id: string; label: string | null; setLabel: (label: string | null) => void };

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

function useFormItemLabel(): string | null {
  return useContext(FormItemContext).label ?? null;
}

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  };
}

type FormScrollContextValue = {
  registerField: (name: string, ref: React.RefObject<View | null>) => void;
  unregisterField: (name: string) => void;
  registerScroller: (ref: React.RefObject<ScrollView | null>) => void;
  setOffset: (y: number) => void;
};

const FormScrollContext = createContext<FormScrollContextValue | null>(null);

function useFormScroll() {
  const scrollerRef = useRef<React.RefObject<ScrollView | null> | null>(null);
  const offsetY = useRef(0);
  const fieldRefs = useRef(new Map<string, React.RefObject<View | null>>());

  const scrollToFirstError = useCallback((form: UseFormReturn<FieldValues>) => {
    const name = Object.keys(form.formState.errors)[0];
    if (!name) return;

    const field = fieldRefs.current.get(name)?.current;
    const scroller = scrollerRef.current?.current;
    if (IS_WEB || !field || !scroller) {
      form.setFocus(name);
      return;
    }

    field.measureInWindow((_x, y) => {
      scroller.scrollTo({ y: Math.max(0, offsetY.current + y - 80), animated: true });
      form.setFocus(name);
    });
  }, []);

  const scrollContextValue = useMemo<FormScrollContextValue>(
    () => ({
      registerField: (name, ref) => fieldRefs.current.set(name, ref),
      unregisterField: (name) => fieldRefs.current.delete(name),
      registerScroller: (ref) => {
        scrollerRef.current = ref;
      },
      setOffset: (y) => {
        offsetY.current = y;
      },
    }),
    []
  );

  return { scrollToFirstError, scrollContextValue };
}

function FormItem({ className, ...props }: ViewProps & { className?: string }) {
  const id = useId();
  const ref = useRef<View>(null);
  const fieldContext = useContext(FormFieldContext);
  const scrollContext = useContext(FormScrollContext);
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ id, label, setLabel }), [id, label]);

  useEffect(() => {
    if (!scrollContext || !fieldContext.name) return;
    scrollContext.registerField(fieldContext.name, ref);
    return () => scrollContext.unregisterField(fieldContext.name);
  }, [scrollContext, fieldContext.name]);

  return (
    <FormItemContext.Provider value={value}>
      <View ref={ref} className={cn('gap-2', className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, children, ...props }: ComponentProps<typeof Text>) {
  const { error, formItemId } = useFormField();
  const { setLabel } = useContext(FormItemContext);
  const text = typeof children === 'string' ? children : null;

  useEffect(() => {
    setLabel?.(text);
    return () => setLabel?.(null);
  }, [setLabel, text]);

  return (
    <Text
      nativeID={formItemId}
      className={cn('text-legacy-caption font-medium', error && 'text-error-strong', className)}
      {...props}>
      {children}
    </Text>
  );
}

type LabelledProps = {
  accessibilityLabel?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

function FormControl({ children, ...props }: ViewProps) {
  const { error, formItemId, formMessageId } = useFormField();
  const label = useFormItemLabel();
  const labelled = Children.map(children, (child) => {
    if (!isValidElement<LabelledProps>(child)) return child;
    const own = child.props;
    return cloneElement(child as ReactElement<LabelledProps>, {
      accessibilityLabel: own.accessibilityLabel ?? label ?? undefined,
      'aria-labelledby': own['aria-labelledby'] ?? (label ? formItemId : undefined),
      'aria-describedby': own['aria-describedby'] ?? (error ? formMessageId : undefined),
      'aria-invalid': own['aria-invalid'] ?? (error ? true : undefined),
    });
  });
  return (
    <View accessible={false} {...props}>
      {labelled}
    </View>
  );
}

function FormDescription({ className, children, ...props }: ComponentProps<typeof Text>) {
  const { formDescriptionId } = useFormField();
  const { tk } = useTranslation();

  return (
    <Text
      nativeID={formDescriptionId}
      className={cn('text-foreground-secondary text-xs leading-4', className)}
      {...props}>
      {typeof children === 'string' ? tk(children) : children}
    </Text>
  );
}

function FormMessage({ className, children, ...props }: ComponentProps<typeof Text>) {
  const { error, formMessageId } = useFormField();
  const { tk } = useTranslation();
  const body = error ? String(error.message ?? '') : children;

  if (!body) return null;

  return (
    <Text
      nativeID={formMessageId}
      className={cn('text-error-strong text-xs leading-4', className)}
      {...props}>
      {typeof body === 'string' ? tk(body) : body}
    </Text>
  );
}

export {
  useFormItemLabel,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormScrollContext,
  useFormField,
  useFormScroll,
};
