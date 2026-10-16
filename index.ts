import { AppRegistry } from 'react-native';
import { declineHeadlessTask, DECLINE_TASK_NAME } from '@/features/voice/services/decline/decline-headless';

AppRegistry.registerHeadlessTask(DECLINE_TASK_NAME, () => declineHeadlessTask);

import 'expo-router/entry';
