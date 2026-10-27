import type { NetErrorCode, TranslationKey } from '@/core/types';
import type { InfoRow } from '@/features/auth/model/info-row';

export type PairingSearch = 'searching' | 'found' | 'missing';

export type PairingView = 'code' | 'address' | 'mismatch';

export type PairingNote = { tone: 'info' | 'ok' | 'alert'; key: TranslationKey };

export type PairingStateInput = {
  search: PairingSearch;
  error: NetErrorCode | null;
  manual: boolean;
  paired: boolean;
};

export type PairingState = {
  view: PairingView;
  note: PairingNote | null;
  codeError: TranslationKey | null;
  addressError: TranslationKey | null;
};

const NOTE_ERROR: Partial<Record<NetErrorCode, TranslationKey>> = {
  ALREADY_PAIRED: 'screens.pairing.errors.already-paired',
  PAIRING_DECLINED: 'screens.pairing.errors.declined',
};

const QUIET: ReadonlySet<NetErrorCode> = new Set(['INVALID_PAIRING_CODE', 'DISCOVERY_NOT_FOUND']);

function viewOf({ search, error, manual }: PairingStateInput): PairingView {
  if (error === 'FINGERPRINT_MISMATCH') return 'mismatch';
  if (manual) return 'address';
  if (error === 'HOST_NOT_ALLOWED') return 'mismatch';
  return search === 'missing' || error === 'DISCOVERY_NOT_FOUND' ? 'address' : 'code';
}

function noteOf(input: PairingStateInput, view: PairingView): PairingNote | null {
  const { error, search, paired } = input;
  if (paired) return { tone: 'ok', key: 'screens.pairing.paired' };
  if (error && !QUIET.has(error) && !(view === 'address' && error === 'HOST_NOT_ALLOWED'))
    return { tone: 'alert', key: NOTE_ERROR[error] ?? 'screens.pairing.errors.network' };
  if (view !== 'code') return null;
  if (search === 'searching') return { tone: 'info', key: 'screens.pairing.searching' };
  return search === 'found' ? { tone: 'ok', key: 'screens.pairing.found' } : null;
}

export function pairingStateOf(input: PairingStateInput): PairingState {
  const view = viewOf(input);
  return {
    view,
    note: noteOf(input, view),
    codeError:
      input.error === 'INVALID_PAIRING_CODE' ? 'screens.pairing.errors.invalid-code' : null,
    addressError:
      view === 'address' && input.error === 'HOST_NOT_ALLOWED'
        ? 'screens.pairing.errors.invalid-address'
        : null,
  };
}

export const notFoundRowsOf = (native: boolean): readonly InfoRow[] => [
  {
    key: 'wifi',
    icon: 'wifi',
    title: 'screens.pairing.not-found.wifi.title',
    meta: native
      ? 'screens.pairing.not-found.wifi.phone'
      : 'screens.pairing.not-found.wifi.desktop',
  },
  {
    key: 'where',
    icon: 'screen',
    title: 'screens.pairing.not-found.where.title',
    meta: 'screens.pairing.not-found.where.meta',
  },
];
