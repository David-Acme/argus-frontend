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
const CELL = 150;
const ICONS = [28, 36, 48] as const;
const CATALOGUE: readonly PresenceState[] = [
  'idle',
  'listen',
  'think',
  'speak',
  'happy',
  'alert',
  'watch',
  'look',
  'sleep',
  'off',
];

function CatalogueCell({ state }: { state: PresenceState }) {
  return (
    <LabCase id={`state-${state}`}>
      <View className="items-center">
        <Presence state={state} size={CELL} />
        <View className="mt-1.5 flex-row items-center gap-2">
          {ICONS.map((size) => (
            <Presence key={size} state={state} size={size} />
          ))}
        </View>
      </View>
    </LabCase>
  );
}

function Playground() {
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
      </View>
    </LabCase>
  );
}

export function PresenceDemo() {
  return (
    <>
      <Playground />
      {CATALOGUE.map((name) => (
        <CatalogueCell key={name} state={name} />
      ))}
    </>
  );
}
