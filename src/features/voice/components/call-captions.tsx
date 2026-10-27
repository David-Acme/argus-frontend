import { View } from 'react-native';
import type { VoiceTranscriptLine } from '@/core/types';
import { Text } from '@/shared/ui/text';
import { useCallScale } from '@/features/voice/hooks/use-call-scale';

type CallCaptionsProps = { lines: readonly VoiceTranscriptLine[]; empty: string };

export function CallCaptions({ lines, empty }: CallCaptionsProps) {
  const { captionLines } = useCallScale();
  const visible = lines.slice(-captionLines);
  return (
    <View accessibilityLiveRegion="polite" className="w-full gap-2">
      {visible.length === 0 ? (
        <Text variant="meta" tone="3" align="center">
          {empty}
        </Text>
      ) : null}
      {visible.map((line) => (
        <Text
          key={line.id}
          variant={line.role === 'user' ? 'label' : 'feed'}
          tone={line.role === 'user' ? 'default' : '2'}
          align="center">
          {line.role === 'user' ? `«${line.text}»` : line.text}
        </Text>
      ))}
    </View>
  );
}
