import { View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Status, type StatusStat } from '@/shared/ui/status';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

const HOME: readonly StatusStat[] = [
  { icon: 'cam', value: '5', label: copy.cameras },
  { icon: 'shieldok', value: '0', label: copy.alertsToday },
  { icon: 'hist', value: '4', label: copy.detections },
];

const SECURITY: readonly StatusStat[] = [
  { value: '0', label: copy.inProgress },
  { value: '1', label: copy.toReview, tone: 'attn' },
  { icon: 'door', value: '1', label: copy.visitToday },
];

const DESK: readonly StatusStat[] = [
  { icon: 'cam', value: '5', label: copy.cameras },
  { icon: 'shieldok', value: '0', label: copy.alertsToday },
];

export function StatusDemo() {
  return (
    <>
      <LabCase id="hero-calm" block>
        <Status
          tone="calm"
          sentence={copy.hero}
          meta={copy.heroMeta}
          stats={HOME}
          presence="idle"
        />
      </LabCase>
      <LabCase id="hero-security" block>
        <Status
          tone="calm"
          sentence={copy.atHome}
          meta={copy.atHomeMeta}
          stats={SECURITY}
          presence="idle"
        />
      </LabCase>
      <LabCase id="hero-night" block>
        <Status tone="calm" sentence={copy.goodNight} meta={copy.nightMeta} presence="watch" />
      </LabCase>
      <LabCase id="hero-band" block>
        <Status
          tone="calm"
          sentence={copy.hero}
          meta={copy.deskMeta}
          stats={DESK}
          presence="idle"
          action={<Button variant="primary" compact icon="plus" label={copy.add} onPress={noop} />}
        />
      </LabCase>
      <LabCase id="alert" block>
        <Status
          tone="alert"
          secondary
          sentence={copy.heroAlert}
          meta={copy.heroAlertMeta}
          presence="alert"
        />
        <Status
          variant="card"
          tone="alert"
          media={<View className="rounded-media bg-fill aspect-video" />}
          primary={{ label: copy.seeCamera, onPress: noop }}
          secondaryAction={{ label: copy.known, onPress: noop }}
          tertiary={{ label: copy.falseAlarm, onPress: noop }}
        />
      </LabCase>
    </>
  );
}
