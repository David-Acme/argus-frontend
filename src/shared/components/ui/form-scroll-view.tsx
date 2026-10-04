import { useContext, useEffect, useRef, type ComponentType, type ReactNode, type Ref } from 'react';
import type { ScrollView as RNScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IS_WEB, OVERLAY_RING_GUTTER } from '@/shared/constants';
import { FormScrollContext, type useFormScroll } from './form';
import { OverlayBodyContext } from './overlay-body';

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
  contentContainerStyle: { flexGrow: 0, padding: OVERLAY_RING_GUTTER },
} as const;

const GUTTER = { margin: -OVERLAY_RING_GUTTER };

export function FormScrollView({
  formScroll,
  children,
  keyboardAware = false,
  maxHeight,
  className,
}: FormScrollViewProps) {
  const ref = useRef<RNScrollView>(null);
  const overlayBody = useContext(OverlayBodyContext);
  const { registerScroller, setOffset } = formScroll.scrollContextValue;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffset(event.nativeEvent.contentOffset.y);
  };

  useEffect(() => {
    if (!overlayBody) {
      registerScroller(ref);
      return;
    }
    registerScroller(overlayBody.scrollRef);
    overlayBody.setScrollListener(setOffset);
    return () => overlayBody.setScrollListener(null);
  }, [overlayBody, registerScroller, setOffset]);

  const body = (
    <FormScrollContext.Provider value={formScroll.scrollContextValue}>
      {children}
    </FormScrollContext.Provider>
  );

  if (overlayBody) return body;

  if (keyboardAware && !IS_WEB) {
    return (
      <KeyboardAwareScrollView
        ref={ref as unknown as Ref<never>}
        onScroll={onScroll}
        className={className}
        style={[GUTTER, maxHeight ? { maxHeight } : null]}
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
      style={[GUTTER, maxHeight ? { maxHeight } : null]}
      {...SHARED}>
      {body}
    </ScrollView>
  );
}
