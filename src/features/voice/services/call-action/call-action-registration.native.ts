import { AppRegistry } from 'react-native';
import { CALL_ACTION_TASK_NAME } from '@/features/voice/constants/call.constant';
import { callActionHeadlessTask } from '@/features/voice/services/call-action/call-action-headless';

export const registerCallActionHeadlessTask = (): void => {
  AppRegistry.registerHeadlessTask(CALL_ACTION_TASK_NAME, () => callActionHeadlessTask);
};
