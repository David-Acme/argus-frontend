import { View } from 'react-native';
import { auraField, auraTones, inset, size } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { LabCase } from '../components/lab-case';

const FIELD = { height: auraField.height };

const BAND = { height: size.presenceBand + inset.status.bandY * 2 };

const PHONE = { height: auraField.height };

export function AuraDemo() {
  return (
    <>
      {auraTones.map((tone) => (
        <LabCase key={tone} id={`field-${tone}`} block>
          <View className="bg-bg overflow-hidden" style={FIELD}>
            <Aura tone={tone} />
          </View>
        </LabCase>
      ))}
      <LabCase id="band" block>
        <View className="rounded-card bg-surface overflow-hidden" style={BAND}>
          <Aura tone="calm" mode="band" />
        </View>
      </LabCase>
      <LabCase id="band-alert" block>
        <View className="rounded-card bg-surface overflow-hidden" style={BAND}>
          <Aura tone="alert" mode="band" />
        </View>
      </LabCase>
      <LabCase id="edge" block>
        <View className="rounded-sheet bg-bg overflow-hidden" style={PHONE}>
          <Aura tone="listen" />
          <Aura tone="listen" mode="edge" />
        </View>
      </LabCase>
    </>
  );
}
