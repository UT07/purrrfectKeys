/**
 * Notification Service — local notifications for streak reminders,
 * league results, and challenge updates.
 *
 * Uses expo-notifications for scheduling local notifications.
 * Remote push (FCM) can be added later via expo-notifications push token.
 *
 * Each notification category uses a well-known identifier prefix so we can
 * cancel/reschedule individual categories without wiping unrelated reminders.
 */
import * as Notifications from 'expo-notifications';

// ── Notification identifier constants ──────────────────────────────────
const DAILY_REMINDER_ID = 'purrrfect-daily-reminder';
const STREAK_REMINDER_ID = 'purrrfect-streak-reminder';

// Configure notification handler (shows when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Request notification permissions */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel a single scheduled notification by its identifier.
 * Silently ignores if the identifier doesn't exist.
 */
async function cancelNotificationById(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Notification may not exist — safe to ignore
  }
}

/** Schedule a daily practice reminder (replaces any existing daily reminder) */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
): Promise<string> {
  // Cancel only the previous daily reminder, not streak or other notifications
  await cancelNotificationById(DAILY_REMINDER_ID);
  const id = await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Time to practice!',
      body: "Your cat misses you. Keep your streak alive!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return id;
}

/** Schedule a streak-at-risk reminder (fires at 8pm daily, replaces any existing) */
export async function scheduleStreakReminder(): Promise<string> {
  // Cancel only the previous streak reminder
  await cancelNotificationById(STREAK_REMINDER_ID);
  const id = await Notifications.scheduleNotificationAsync({
    identifier: STREAK_REMINDER_ID,
    content: {
      title: 'Streak at risk!',
      body: 'Practice now to keep your streak going!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
  return id;
}

/** Send an immediate local notification */
export async function sendLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

/**
 * Cancel all app-managed scheduled notifications (daily reminder + streak reminder).
 * Does NOT use cancelAllScheduledNotificationsAsync — only cancels known identifiers
 * so that any other notification sources (system, push) are preserved.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Promise.all([
    cancelNotificationById(DAILY_REMINDER_ID),
    cancelNotificationById(STREAK_REMINDER_ID),
  ]);
}
