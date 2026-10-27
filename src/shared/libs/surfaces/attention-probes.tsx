import { useCallback, useEffect } from 'react';
import { attentionStore } from './attention-store';
import { useSurfaces } from './surface-context';
import type { AttentionItem, AttentionSurface, Placed } from './surface-registry';

type ProbeHostProps = { source: Placed<AttentionSurface> };

function ProbeHost({ source }: ProbeHostProps) {
  const { id, module, probe: Probe } = source;
  const report = useCallback(
    (items: readonly AttentionItem[]) => attentionStore.report(id, module, items),
    [id, module]
  );
  useEffect(() => () => attentionStore.drop(id), [id]);
  return <Probe report={report} />;
}

export function AttentionProbes() {
  const sources = useSurfaces().attention;
  return (
    <>
      {sources.map((source) => (
        <ProbeHost key={source.id} source={source} />
      ))}
    </>
  );
}
