import { Notice } from '@/shared/ui/notice';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function NoticeDemo() {
  return (
    <>
      <LabCase id="card-attention" block>
        <Notice
          tone="attention"
          icon="wifioff"
          title={copy.offline}
          body={copy.checkWifi}
          action={{ label: copy.retry, onPress: noop }}
        />
      </LabCase>
      <LabCase id="card-info" block>
        <Notice icon="shieldok" title={copy.allCalm} body={copy.allCalmMeta} />
      </LabCase>
      <LabCase id="card-primary" block>
        <Notice
          icon="check"
          title={copy.nothingToday}
          body={copy.askArgus}
          action={{ label: copy.newReminder, onPress: noop, primary: true }}
        />
      </LabCase>
      <LabCase id="card-centred" block>
        <Notice
          centred
          icon="cal"
          title={copy.nothingToday}
          body={copy.askArgus}
          action={{ label: copy.newReminder, onPress: noop, primary: true }}
        />
      </LabCase>
      <LabCase id="banner-attention" block>
        <Notice inline tone="attention" icon="wifioff" title={copy.offlineBanner} />
      </LabCase>
      <LabCase id="banner-info" block>
        <Notice inline icon="lock" title={copy.callsOff} />
      </LabCase>
    </>
  );
}
