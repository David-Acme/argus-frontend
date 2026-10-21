import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { IconGlyph } from '@/shared/ui/icon';
import { Notice, type NoticeAction } from '@/shared/ui/notice';
import type { PresenceState } from '@/shared/ui/presence';

export type EmptyProps = {
  message: string;
  detail?: string;
  action: Omit<NoticeAction, 'primary'>;
  icon?: IconGlyph;
  presence?: PresenceState;
  children?: ReactNode;
};

export function Empty({ message, detail, action, icon, presence, children }: EmptyProps) {
  return (
    <View className="gap-3">
      <Notice
        title={message}
        body={detail}
        icon={icon ?? 'check'}
        presence={presence}
        action={{ ...action, primary: true }}
      />
      {children}
    </View>
  );
}
