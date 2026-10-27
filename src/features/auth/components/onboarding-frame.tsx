import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScopedTheme } from 'uniwind';
import { layout, space, useThemeTokens } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { ScreenScroll } from '@/shared/ui/screen';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';

export type OnboardingTone = 'light' | 'dark';

export type OnboardingFrameProps = {
  tone?: OnboardingTone;
  top?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

type BodyProps = Pick<OnboardingFrameProps, 'top' | 'footer' | 'children'>;

type ToneProps = { dark: boolean; children: ReactNode };

const CARD = { maxWidth: layout.dialog, maxHeight: '100%' } as const;

const CARD_CONTENT = {
  flexGrow: 1,
  paddingTop: space[8],
  paddingHorizontal: space[6],
  paddingBottom: space[6],
} as const;

function Body({ top, footer, children }: BodyProps) {
  return (
    <>
      {top}
      {children}
      {footer ? <View className="mt-6 gap-2">{footer}</View> : null}
    </>
  );
}

function Tone({ dark, children }: ToneProps) {
  return dark ? <ScopedTheme theme="dark">{children}</ScopedTheme> : children;
}

export function OnboardingFrame({ tone = 'light', top, footer, children }: OnboardingFrameProps) {
  const insets = useSafeAreaInsets();
  const { elevation } = useThemeTokens();
  const { card, top: lift } = useOnboardingLayout();
  const dark = tone === 'dark';
  const body = (
    <Body top={top} footer={footer}>
      {children}
    </Body>
  );
  if (card)
    return (
      <View className="bg-bg flex-1 items-center justify-center p-8">
        <Aura tone="calm" mode="band" />
        <Tone dark={dark}>
          <View
            className={clsx('rounded-sheet w-full overflow-hidden', dark ? 'bg-bg' : 'bg-surface')}
            style={[CARD, { boxShadow: elevation.card }]}>
            <ScreenScroll hug contentStyle={CARD_CONTENT}>
              {body}
            </ScreenScroll>
          </View>
        </Tone>
      </View>
    );
  const content = {
    flexGrow: 1,
    paddingTop: insets.top + lift,
    paddingBottom: insets.bottom + space[6],
    paddingHorizontal: layout.gutterCompact,
  };
  return (
    <Tone dark={dark}>
      <View className="bg-bg flex-1">
        {dark ? null : <Aura tone="calm" />}
        <ScreenScroll contentStyle={content}>{body}</ScreenScroll>
      </View>
    </Tone>
  );
}
