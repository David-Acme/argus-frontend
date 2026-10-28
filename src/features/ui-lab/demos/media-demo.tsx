import { Button } from '@/shared/ui/button';
import { View } from 'react-native';
import { size } from '@/shared/theme';
import { Media, MediaPlayer, MediaStrip } from '@/shared/ui/media';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';
import { Scene } from './scene';

const noop = () => undefined;

const FILL_FRAME = { height: size.mediaStrip };

const STAGE_CONTROLS = [
  { icon: 'speaker', label: copy.sound, onPress: noop },
  { icon: 'max', label: copy.fullscreen, onPress: noop },
] as const;

function MediaLayoutDemo() {
  return (
    <>
      <LabCase id="tile-fill" block>
        <View className="gap-media-grid-gap flex-row" style={FILL_FRAME}>
          <View className="flex-1">
            <Media
              fill
              name={copy.kitchen}
              detail={copy.kitchenTime}
              live={copy.live}
              onPress={noop}>
              <Scene name="kitchen" />
            </Media>
          </View>
          <View className="flex-1">
            <Media fill name={copy.patio} live={copy.live} onPress={noop}>
              <Scene name="patio" />
            </Media>
          </View>
        </View>
      </LabCase>
      <LabCase id="strip" block>
        <MediaStrip label={copy.cameraStrip}>
          <Media
            name={copy.clipLuisArrived}
            detail={copy.kitchenTime}
            onPress={noop}
            center={
              <Button
                iconOnly
                glass
                icon="play"
                iconSize="small"
                label={copy.play}
                onPress={noop}
              />
            }>
            <Scene name="door" />
          </Media>
          <Media name={copy.kitchen} detail={copy.kitchenTime} live={copy.live} onPress={noop}>
            <Scene name="kitchen" />
          </Media>
          <Media name={copy.patio} live={copy.live} onPress={noop}>
            <Scene name="patio" />
          </Media>
        </MediaStrip>
      </LabCase>
    </>
  );
}

function MediaPlayerDemo() {
  return (
    <>
      <LabCase id="player-loading" block>
        <MediaPlayer source={null} title={copy.kitchen} />
      </LabCase>
      <LabCase id="player-failed" block>
        <MediaPlayer source={null} failed title={copy.kitchen} onRetry={noop} />
      </LabCase>
    </>
  );
}

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
      <LabCase id="tile-eye" block>
        <Media name={copy.kitchen} live={copy.live} eye={{ label: copy.argusWatching }}>
          <Scene name="kitchen" />
        </Media>
      </LabCase>
      <LabCase id="patio" block>
        <Media name={copy.patio} live={copy.live} detail={copy.kitchenTime}>
          <Scene name="patio" />
        </Media>
      </LabCase>
      <MediaPlayerDemo />
      <MediaLayoutDemo />
    </>
  );
}
