import { View } from 'react-native';
import type { VoiceTranscriptLine } from '@/core/types';
import { Text } from '@/shared/ui/text';
import { CALL_CAPTION_LINES } from '@/features/voice/constants/call.constant';

export function CallCaptions({ lines }: { lines: readonly VoiceTranscriptLine[] }) {
  const visible = lines.slice(-CALL_CAPTION_LINES);
  if (visible.length === 0) return null;
  return (
    <View accessibilityLiveRegion="polite" className="w-full gap-2">
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
