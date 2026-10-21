import { useState } from 'react';
import { Chip, FilterChip } from '@/shared/ui/chip';
import { Cluster } from '@/shared/ui/layout';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

export function ChipDemo() {
  const [monthly, setMonthly] = useState(true);
  const [callMe, setCallMe] = useState(false);
  return (
    <>
      <LabCase id="tag-ok-dot">
        <Chip tone="ok" dot label={copy.live} />
      </LabCase>
      <LabCase id="tag-attn">
        <Chip tone="attn" label={copy.review} />
      </LabCase>
      <LabCase id="tag-default">
        <Chip label={copy.call} />
      </LabCase>
      <LabCase id="stat-icon">
        <Chip size="stat" icon="cam" value="5" label={copy.cameras} />
      </LabCase>
      <LabCase id="stat-plain">
        <Chip size="stat" value="0" label={copy.ongoing} />
      </LabCase>
      <LabCase id="stat-attn">
        <Chip size="stat" tone="attn" value="1" label={copy.toReview} />
      </LabCase>
      <LabCase id="suggestion">
        <Chip size="suggestion" label={copy.showKitchen} />
      </LabCase>
      <LabCase id="filters" block>
        <Cluster>
          <FilterChip
            size="suggestion"
            icon="repeat"
            label={copy.monthly}
            selected={monthly}
            onPress={() => setMonthly(!monthly)}
          />
          <FilterChip
            size="suggestion"
            icon="phone"
            label={copy.callMe}
            selected={callMe}
            onPress={() => setCallMe(!callMe)}
          />
        </Cluster>
      </LabCase>
    </>
  );
}
