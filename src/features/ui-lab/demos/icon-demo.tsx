import { Cluster } from '@/shared/ui/layout';
import { Icon, ICON_SHAPES, type IconGlyph } from '@/shared/ui/icon';
import { LabCase } from '../components/lab-case';

const GLYPHS = Object.keys(ICON_SHAPES) as IconGlyph[];

export function IconDemo() {
  return (
    <>
      <LabCase id="set-24" block>
        <Cluster gap={3}>
          {GLYPHS.map((name) => (
            <Icon key={name} name={name} />
          ))}
        </Cluster>
      </LabCase>
      <LabCase id="set-20" block>
        <Cluster gap={3}>
          {GLYPHS.map((name) => (
            <Icon key={name} name={name} size="small" tone="accent" />
          ))}
        </Cluster>
      </LabCase>
      <LabCase id="plus">
        <Icon name="plus" />
      </LabCase>
      <LabCase id="more">
        <Icon name="more" />
      </LabCase>
      <LabCase id="door-accent">
        <Icon name="door" size="small" tone="accent" />
      </LabCase>
    </>
  );
}
