import { Text } from '@/shared/ui/text';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

export function TextDemo() {
  return (
    <>
      <LabCase id="hero" block>
        <Text variant="hero" heading={1}>
          {copy.heroToken}
        </Text>
      </LabCase>
      <LabCase id="title" block>
        <Text variant="title">{copy.titleToken}</Text>
      </LabCase>
      <LabCase id="headline" block>
        <Text variant="headline">{copy.headlineToken}</Text>
      </LabCase>
      <LabCase id="body" block>
        <Text variant="body">{copy.bodyToken}</Text>
      </LabCase>
      <LabCase id="meta" block>
        <Text variant="meta">{copy.metaToken}</Text>
      </LabCase>
      <LabCase id="caption" block>
        <Text variant="caption">{copy.captionToken}</Text>
      </LabCase>
      <LabCase id="hero-compact" block>
        <Text variant="heroCompact">{copy.hero}</Text>
      </LabCase>
      <LabCase id="hero-secondary" block>
        <Text variant="heroSecondary">{copy.heroAlert}</Text>
      </LabCase>
      <LabCase id="body-2" block>
        <Text variant="body" tone="2">
          {copy.welcomeBody}
        </Text>
      </LabCase>
    </>
  );
}
