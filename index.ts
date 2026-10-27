import { registerCallActionHeadlessTask } from '@/features/voice/services/call-action';
import { registerDeclineHeadlessTask } from '@/features/voice/services/decline';
import 'expo-router/entry';

registerDeclineHeadlessTask();
registerCallActionHeadlessTask();
