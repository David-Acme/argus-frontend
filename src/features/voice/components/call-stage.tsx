import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScopedTheme } from 'uniwind';
import { useTranslation } from '@/shared/hooks/use-translation';
import { space } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { Icon } from '@/shared/ui/icon';
import type { PresenceState } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { CallAvatar } from '@/features/voice/components/call-avatar';
import { CALL_STAGE_MAX_WIDTH } from '@/features/voice/constants/call.constant';
import { useCallScale } from '@/features/voice/hooks/use-call-scale';
import type { CallKind } from '@/features/voice/model/incoming-surface';

type CallStageProps = {
  kind: CallKind;
  line: string;
  presence: PresenceState;
  ended?: boolean;
  level?: SharedValue<number>;
  top?: ReactNode;
  children: ReactNode;
};

const COLUMN = { maxWidth: CALL_STAGE_MAX_WIDTH };

export function CallStage({
  kind,
  line,
  presence,
  ended = false,
  level,
  top,
  children,
}: CallStageProps) {
  const { t } = useTranslation();
  const scale = useCallScale();
  const gap = { marginTop: scale.avatarGap };
  const insets = useSafeAreaInsets();
  const frame = { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[6] };
  return (
    <ScopedTheme theme="dark">
      <View className="bg-bg flex-1 overflow-hidden" style={frame}>
        {kind === 'alert' ? <Aura tone="alert" /> : null}
        <View className="w-full flex-1 items-center self-center px-4" style={COLUMN}>
          <View className="min-h-12 w-full justify-center">{top}</View>
          <View className="items-center gap-1">
            <View className="flex-row items-center gap-1">
              <Icon name="lock" size="small" tone="text-2" />
              <Text variant="caption" tone="2">
                {t('screens.voice.stage.private')}
              </Text>
            </View>
            <Text variant="heroCompact" heading={1} align="center">
              {t('screens.voice.argus')}
            </Text>
            <Text variant="meta" tone="2" align="center" numberOfLines={2}>
              {line}
            </Text>
          </View>
          <View style={gap}>
            <CallAvatar
              state={presence}
              size={ended ? scale.endedAvatar : scale.avatar}
              level={level}
              label={t('screens.voice.stage.estela')}
            />
          </View>
          {children}
        </View>
      </View>
    </ScopedTheme>
  );
}
