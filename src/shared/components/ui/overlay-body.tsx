import { createContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { IS_WEB, OVERLAY_RING_GUTTER } from '@/shared/constants';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { cn } from '@/shared/libs/utils';

type ScrollListener = (offsetY: number) => void;

type OverlayBodyContextValue = {
  scrollRef: RefObject<RNScrollView | null>;
  setScrollListener: (listener: ScrollListener | null) => void;
};

type OverlayBodyProps = {
  children: ReactNode;
  inset: number;
  onOverflowChange?: (overflowing: boolean) => void;
  className?: string;
};

type ScrollableHost = { getScrollableNode?: () => unknown };

type ScrollableNode = { scrollHeight: number; clientHeight: number };

const OverlayBodyContext = createContext<OverlayBodyContextValue | null>(null);

function scrollableNode(scroll: RNScrollView | null): ScrollableNode | null {
  const node = (scroll as ScrollableHost | null)?.getScrollableNode?.();
  if (typeof node !== 'object' || node === null || !('scrollHeight' in node) || !('clientHeight' in node)) {
    return null;
  }
  return node as ScrollableNode;
}

function OverlayBody({ children, inset, onOverflowChange, className }: OverlayBodyProps) {
  const scrollRef = useRef<RNScrollView>(null);
  const listener = useRef<ScrollListener | null>(null);
  const viewport = useRef(0);
  const content = useRef(0);
  const [overflowing, setOverflowing] = useState(false);
  const bodyHeight = useOverlayBodyHeight();

  const value = useMemo<OverlayBodyContextValue>(
    () => ({
      scrollRef,
      setScrollListener: (next) => {
        listener.current = next;
      },
    }),
    []
  );

  const measure = () => {
    const node = IS_WEB ? scrollableNode(scrollRef.current) : null;
    const next = node
      ? node.scrollHeight - node.clientHeight > 1
      : content.current - viewport.current > 1;
    if (next === overflowing) return;
    setOverflowing(next);
    onOverflowChange?.(next);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
    measure();
  };

  const onContentSizeChange = (_width: number, height: number) => {
    content.current = height;
    measure();
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    listener.current?.(event.nativeEvent.contentOffset.y);
  };

  return (
    <OverlayBodyContext.Provider value={value}>
      <ScrollView
        ref={scrollRef as never}
        className={cn(IS_WEB && 'min-h-0 shrink scroll-py-6', className)}
        style={{
          marginHorizontal: -inset,
          ...(IS_WEB ? null : { maxHeight: bodyHeight }),
        }}
        contentContainerStyle={{
          flexGrow: 0,
          paddingHorizontal: inset,
          paddingVertical: OVERLAY_RING_GUTTER,
        }}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={IS_WEB}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </OverlayBodyContext.Provider>
  );
}

export { OverlayBody, OverlayBodyContext, type OverlayBodyContextValue };
