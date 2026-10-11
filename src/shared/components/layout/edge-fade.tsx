import { View } from 'react-native';
import { EDGE_FADE_BANDS } from '@/shared/constants';

type EdgeFadeProps = {
  edge: 'top' | 'bottom';
  solid: number;
  fade: number;
};

export function EdgeFade({ edge, solid, fade }: EdgeFadeProps) {
  const band = fade / EDGE_FADE_BANDS;
  const bands = Array.from({ length: EDGE_FADE_BANDS }, (_, index) => 1 - (index + 1) / (EDGE_FADE_BANDS + 1));
  const ordered = edge === 'top' ? bands : [...bands].reverse();

  return (
    <View
      pointerEvents="none"
      className="absolute right-0 left-0"
      style={edge === 'top' ? { top: 0 } : { bottom: 0 }}>
      {edge === 'top' ? <View className="bg-background" style={{ height: solid }} /> : null}
      {ordered.map((opacity, index) => (
        <View key={index} className="bg-background" style={{ height: band, opacity }} />
      ))}
      {edge === 'bottom' ? <View className="bg-background" style={{ height: solid }} /> : null}
    </View>
  );
}
