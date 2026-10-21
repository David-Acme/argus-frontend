import { Button } from '@/shared/ui/button';
import { Media } from '@/shared/ui/media';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';
import { Scene } from './scene';

const noop = () => undefined;

const STAGE_CONTROLS = [
  { icon: 'speaker', label: copy.sound, onPress: noop },
  { icon: 'max', label: copy.fullscreen, onPress: noop },
] as const;

export function MediaDemo() {
  return (
    <>
      <LabCase id="tile-live" block>
        <Media
          name={copy.kitchen}
          detail={copy.kitchenTime}
          live={copy.live}
          onPress={noop}
          reveal={
            <>
              <Button compact glass label={copy.see} onPress={noop} />
              <Button compact glass icon="mic" label={copy.talk} onPress={noop} />
            </>
          }>
          <Scene name="kitchen" />
        </Media>
      </LabCase>
      <LabCase id="tile-clip" block>
        <Media
          name={copy.luisArrived}
          detail={copy.kitchenTime}
          onPress={noop}
          center={
            <Button iconOnly glass icon="play" iconSize="small" label={copy.play} onPress={noop} />
          }>
          <Scene name="door" />
        </Media>
      </LabCase>
      <LabCase id="tile-privacy" block>
        <Media name={copy.bedroom} detail={copy.private} dormant="privacy" onPress={noop} />
      </LabCase>
      <LabCase id="tile-off" block>
        <Media name={copy.garage} detail={copy.cameraOff} dormant="off" />
      </LabCase>
      <LabCase id="stage" block>
        <Media
          variant="stage"
          live={copy.live}
          controls={STAGE_CONTROLS}
          eye={{ label: copy.argusWatching }}>
          <Scene name="kitchen" />
        </Media>
      </LabCase>
      <LabCase id="stage-privacy" block>
        <Media variant="stage" name={copy.bedroom} detail={copy.private} dormant="privacy" />
      </LabCase>
      <LabCase id="patio" block>
        <Media name={copy.patio} live={copy.live} detail={copy.kitchenTime}>
          <Scene name="patio" />
        </Media>
      </LabCase>
    </>
  );
}
