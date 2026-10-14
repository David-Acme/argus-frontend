import type { IPushService } from '@/core/interfaces';
import { pushService as pushServiceImpl } from './push';

export const pushService: IPushService = pushServiceImpl;

export { registrationBodyOf, unpairPush } from './push-registration';
export type { PushRegistrationInput, PushUnpairPort } from './push-registration';
