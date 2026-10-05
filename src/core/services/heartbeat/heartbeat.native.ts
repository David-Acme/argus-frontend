import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { t } from '@/core/i18n';
import { readHeartbeat } from '@/core/contracts/heartbeat.contract';
import type { IDeadmanAlarm, IHeartbeatService } from '@/core/interfaces';
import { log } from '@/core/services/log';
import { sessionService } from '@/core/services/session.service';
import type { DeadmanPlan } from '@/core/types';
import {
  DEADMAN_CHANNEL_ID,
  DEADMAN_NOTIFICATION_ID,
  HEARTBEAT_BACKGROUND_INTERVAL_MINUTES,
  HEARTBEAT_BACKGROUND_TASK,
  HEARTBEAT_PUSH_TASK,
  IS_ANDROID,
} from '@/shared/constants';
import { HeartbeatEngine } from './heartbeat-engine';
import { readPushHeartbeat } from './heartbeat-plan';

const clockOf = (at: number): string =>
  new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

class NotificationDeadmanAlarm implements IDeadmanAlarm {
  private channelReady = false;
  private askedPermission = false;

  async apply(plan: DeadmanPlan): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(DEADMAN_NOTIFICATION_ID).catch(() => undefined);
    if (plan.kind === 'disarm') return;
    if (!(await this.permitted())) return;
    await this.ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: DEADMAN_NOTIFICATION_ID,
      content: {
        title: t('common.watchdog.alarm-title'),
        body: t('common.watchdog.alarm-body', { time: clockOf(plan.lastHeardAt) }),
        data: { kind: 'watchdog', url: '/' },
        interruptionLevel: 'timeSensitive',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.fireAt),
        channelId: DEADMAN_CHANNEL_ID,
      },
    });
  }

  private async permitted(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (this.askedPermission || !current.canAskAgain) return false;
    this.askedPermission = true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  }

  private async ensureChannel(): Promise<void> {
    if (!IS_ANDROID || this.channelReady) return;
    await Notifications.setNotificationChannelAsync(DEADMAN_CHANNEL_ID, {
      name: t('common.watchdog.channel'),
      importance: Notifications.AndroidImportance.HIGH,
    });
    this.channelReady = true;
  }
}

const engine = new HeartbeatEngine(new NotificationDeadmanAlarm());

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask(HEARTBEAT_BACKGROUND_TASK, async () => {
  try {
    await sessionService.initialize();
    const heard = await engine.checkNow();
    return heard ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
  } catch (error) {
    log.error('watchdog', 'the background heartbeat check failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

TaskManager.defineTask(HEARTBEAT_PUSH_TASK, async ({ data }) => {
  const beat = readHeartbeat(readPushHeartbeat(data));
  if (beat) await engine.receive(beat);
});

let backgroundRegistered = false;

const registerBackground = async (): Promise<void> => {
  if (backgroundRegistered) return;
  backgroundRegistered = true;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Available)
      await BackgroundTask.registerTaskAsync(HEARTBEAT_BACKGROUND_TASK, {
        minimumInterval: HEARTBEAT_BACKGROUND_INTERVAL_MINUTES,
      });
    await Notifications.registerTaskAsync(HEARTBEAT_PUSH_TASK);
  } catch (error) {
    backgroundRegistered = false;
    log.error('watchdog', 'the background heartbeat could not be registered', error);
  }
};

const unregisterBackground = async (): Promise<void> => {
  if (!backgroundRegistered) return;
  backgroundRegistered = false;
  await BackgroundTask.unregisterTaskAsync(HEARTBEAT_BACKGROUND_TASK).catch(() => undefined);
  await Notifications.unregisterTaskAsync(HEARTBEAT_PUSH_TASK).catch(() => undefined);
};

export const heartbeatService: IHeartbeatService = {
  start: () => {
    engine.start();
    void registerBackground();
  },
  stop: async () => {
    await engine.stop();
    await unregisterBackground();
  },
  receive: (beat, receivedAt) => engine.receive(beat, receivedAt),
  checkNow: () => engine.checkNow(),
  last: () => engine.last(),
  disconnectedAt: () => engine.disconnectedAt(),
  subscribe: (listener) => engine.subscribe(listener),
};
