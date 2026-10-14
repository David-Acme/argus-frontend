export type PushProvider = 'fcm' | 'apns' | 'apns_voip';

export type PushPlatform = 'android' | 'ios';

export type NotificationTokenBody = {
  token: string;
  platform: string;
  lang: string;
  provider: PushProvider;
  publicKey: string;
  keyId: string;
};

export type NotificationTokenRemoval = {
  token: string;
};
