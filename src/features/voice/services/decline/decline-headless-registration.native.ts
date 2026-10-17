import { AppRegistry } from 'react-native';
import { DECLINE_TASK_NAME, declineHeadlessTask } from './decline-headless';

export const registerDeclineHeadlessTask = (): void => {
  AppRegistry.registerHeadlessTask(DECLINE_TASK_NAME, () => declineHeadlessTask);
};
