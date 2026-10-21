import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { Cluster, Inline, Stack } from '@/shared/ui/layout';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function LayoutDemo() {
  return (
    <>
      <LabCase id="cluster" block>
        <Cluster>
          <Chip size="stat" icon="cam" value="5" label={copy.cameras} />
          <Chip size="stat" icon="shieldok" value="0" label={copy.alertsToday} />
          <Chip size="stat" icon="hist" value="4" label={copy.detections} />
        </Cluster>
      </LabCase>
      <LabCase id="inline-fill" block>
        <Inline fill>
          <Button variant="primary" block label={copy.seeCamera} onPress={noop} />
          <Button block label={copy.known} onPress={noop} />
        </Inline>
      </LabCase>
      <LabCase id="stack" block>
        <Stack gap={2}>
          <Button variant="primary" block label={copy.start} onPress={noop} />
          <Button variant="ghost" block label={copy.invitation} onPress={noop} />
        </Stack>
      </LabCase>
    </>
  );
}
