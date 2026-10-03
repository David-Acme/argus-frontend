import { useEffect, useRef, type ComponentType, type ReactNode, type Ref } from 'react';
import type { ScrollView as RNScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IS_WEB } from '@/shared/constants';
import { FormScrollContext, type useFormScroll } from './form';

type FormScrollViewProps = {
  formScroll: ReturnType<typeof useFormScroll>;
  children: ReactNode;
  keyboardAware?: boolean;
  maxHeight?: number;
  className?: string;
};

const SHARED = {
  scrollEventThrottle: 16,
  showsVerticalScrollIndicator: false,
  keyboardDismissMode: 'interactive',
  keyboardShouldPersistTaps: 'handled',
  contentContainerStyle: { flexGrow: 0 },
} as const;

export function FormScrollView({
  formScroll,
  children,
  keyboardAware = false,
  maxHeight,
  className,
}: FormScrollViewProps) {
  const ref = useRef<RNScrollView>(null);
  const { registerScroller, setOffset } = formScroll.scrollContextValue;

  useEffect(() => {
    registerScroller(ref);
  }, [registerScroller]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffset(event.nativeEvent.contentOffset.y);
  };

  const body = (
    <FormScrollContext.Provider value={formScroll.scrollContextValue}>
      {children}
    </FormScrollContext.Provider>
  );

  if (keyboardAware && !IS_WEB) {
    return (
      <KeyboardAwareScrollView
        ref={ref as unknown as Ref<never>}
        onScroll={onScroll}
        className={className}
        style={maxHeight ? { maxHeight } : undefined}
        bottomOffset={24}
        {...SHARED}>
        {body}
      </KeyboardAwareScrollView>
    );
  }

  return (
    <ScrollView
      ref={ref as unknown as Ref<ComponentType<any>>}
      onScroll={onScroll}
      className={className}
      style={maxHeight ? { maxHeight } : undefined}
      {...SHARED}>
      {body}
    </ScrollView>
  );
}
