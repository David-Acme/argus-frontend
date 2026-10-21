import { View } from 'react-native';

type LabPresenceProps = { size: number };

export function LabPresence({ size }: LabPresenceProps) {
  const frame = { width: size, height: size };
  return <View className="bg-accent-soft rounded-full" style={frame} />;
}

export const labPresence = (size: number) => <LabPresence size={size} />;
