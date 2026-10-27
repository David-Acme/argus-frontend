import { useEffect } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  chooseMicrophone,
  microphonesSupported,
  onMicrophonesChange,
  refreshMicrophones,
  useMicrophoneStore,
} from '@/shared/libs/microphone';
import type { Microphone } from '@/shared/libs/microphone';
import type { MenuItem, MenuItems } from '@/shared/ui/menu';

export type MicrophoneOption = { id: string; label: string; choice: Microphone | null };

export type Microphones = {
  supported: boolean;
  options: readonly MicrophoneOption[];
  selected: string;
  current: string;
  menu: MenuItems;
  choose: (id: string) => void;
};

export const SYSTEM_MICROPHONE = 'system';

export function useMicrophones(): Microphones {
  const { t } = useTranslation();
  const devices = useMicrophoneStore((state) => state.devices);
  const choice = useMicrophoneStore((state) => state.choice);
  const supported = microphonesSupported();

  useEffect(() => {
    if (!supported) return;
    const refresh = () => void refreshMicrophones();
    refresh();
    return onMicrophonesChange(refresh);
  }, [supported]);

  const named = devices.map((device, index) => ({
    id: device.deviceId,
    label: device.label || t('common.microphone.unnamed', { n: String(index + 1) }),
    choice: device,
  }));
  const system: MicrophoneOption = {
    id: SYSTEM_MICROPHONE,
    label: t('common.microphone.system'),
    choice: null,
  };
  const options: MicrophoneOption[] = [system, ...named];
  const selected = choice?.deviceId ?? SYSTEM_MICROPHONE;
  const choose = (id: string) =>
    chooseMicrophone(options.find((option) => option.id === id)?.choice ?? null);
  const itemOf = (option: MicrophoneOption): MenuItem => ({
    label: option.label,
    icon: option.id === selected ? 'check' : 'mic',
    onPress: () => choose(option.id),
  });
  return {
    supported,
    options,
    selected,
    current: options.find((option) => option.id === selected)?.label ?? choice?.label ?? '',
    menu: [itemOf(system), ...named.map(itemOf)],
    choose,
  };
}
