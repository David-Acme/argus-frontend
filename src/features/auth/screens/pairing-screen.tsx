import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { isPairingCode } from '@/shared/libs/pairing-qr';
import { MismatchView } from '@/features/auth/components/mismatch-view';
import { PairingAddressView, PairingCodeView } from '@/features/auth/components/pairing-views';
import type { PairingForm } from '@/features/auth/components/pairing-views';
import { PAIRED_PAUSE_MS } from '@/features/auth/constants/pairing.constant';
import { usePairingFlow } from '@/features/auth/hooks/use-pairing-flow';
import { useQrScan } from '@/features/auth/hooks/use-qr-scan';
import { pairingStateOf } from '@/features/auth/model/pairing-state';

export default function PairingScreen() {
  const router = useRouter();
  const flow = usePairingFlow();
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [manual, setManual] = useState(false);
  const scan = useQrScan('server', (value) => void flow.scanned(value));
  const state = pairingStateOf({ ...flow, manual });
  const searchAgain = () => {
    setManual(false);
    setAddress('');
    flow.searchAgain();
  };
  const form: PairingForm = {
    state,
    code,
    address,
    busy: flow.busy,
    ready: isPairingCode(code) && !flow.paired,
    setCode,
    setAddress,
    connect: () => flow.connect({ code, address: state.view === 'address' ? address : '' }),
    back: () => (router.canGoBack() ? router.back() : router.replace('/welcome')),
    searchAgain,
    scan,
    openAddress: () => setManual(true),
  };

  useEffect(() => {
    if (!flow.paired) return;
    const timer = setTimeout(() => router.replace('/'), PAIRED_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [flow.paired, router]);

  if (state.view === 'mismatch') return <MismatchView onBack={form.back} onRestart={searchAgain} />;
  if (state.view === 'address') return <PairingAddressView form={form} />;
  return <PairingCodeView form={form} />;
}
