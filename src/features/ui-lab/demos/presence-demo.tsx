import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import {
  Presence,
  presenceEvents,
  presenceStates,
  type PresenceCue,
  type PresenceState,
} from '@/shared/ui/presence';
import { LabCase } from '../components/lab-case';
import { presenceCopy } from './demo-copy';

const STAGE = 190;
const COMPACT = 66;
const ICON = 36;

export function PresenceDemo() {
  const [state, setState] = useState<PresenceState>('idle');
  const [cue, setCue] = useState<PresenceCue | undefined>(undefined);

  return (
    <LabCase id="presence" block>
      <View className="gap-4" testID="presence-demo">
        <Text variant="subhead">{presenceCopy.stage}</Text>
        <View className="items-center">
          <Presence state={state} size={STAGE} event={cue} />
        </View>
        <Text variant="subhead">{presenceCopy.states}</Text>
        <View className="flex-row flex-wrap gap-2">
          {presenceStates.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={name === state ? 'default' : 'secondary'}
              onPress={() => setState(name)}
              testID={`presence-state-${name}`}>
              <Text>{name}</Text>
            </Button>
          ))}
        </View>
        <Text variant="subhead">{presenceCopy.events}</Text>
        <View className="flex-row flex-wrap gap-2">
          {presenceEvents.map((name) => (
            <Button
              key={name}
              size="sm"
              variant="secondary"
              onPress={() => setCue({ name, id: (cue?.id ?? 0) + 1 })}
              testID={`presence-event-${name}`}>
              <Text>{name}</Text>
            </Button>
          ))}
        </View>
        <Text variant="subhead">{presenceCopy.sizes}</Text>
        <View className="flex-row flex-wrap gap-3">
          {presenceStates.map((name) => (
            <View key={name} className="items-center gap-1">
              <Presence state={name} size={COMPACT} />
              <Presence state={name} size={ICON} />
              <Text variant="caption">{name}</Text>
            </View>
          ))}
        </View>
      </View>
    </LabCase>
  );
}
