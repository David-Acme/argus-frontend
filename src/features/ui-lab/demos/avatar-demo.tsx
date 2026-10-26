import { Avatar } from '@/shared/ui/avatar';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

export function AvatarDemo() {
  return (
    <>
      <LabCase id="well">
        <Avatar icon="door" />
      </LabCase>
      <LabCase id="round-attn">
        <Avatar icon="alert" tone="attn" round />
      </LabCase>
      <LabCase id="round-default">
        <Avatar icon="user" round />
      </LabCase>
      <LabCase id="round-ok">
        <Avatar icon="shieldok" tone="ok" round />
      </LabCase>
      <LabCase id="well-alert">
        <Avatar icon="logout" tone="alert" />
      </LabCase>
      <LabCase id="small-attn">
        <Avatar icon="wifioff" tone="attn" size="small" />
      </LabCase>
      <LabCase id="event-mark">
        <Avatar icon="cal" tone="event" size="mark" />
      </LabCase>
      <LabCase id="initial">
        <Avatar initial={copy.anaInitial} label={copy.ana} tone="accent" round />
      </LabCase>
      <LabCase id="initial-large">
        <Avatar initial={copy.anaInitial} label={copy.ana} tone="accent" round size="large" />
      </LabCase>
    </>
  );
}
