/**
 * Notification Service Tests
 *
 * Tests scheduling, permissions, and cancellation of local notifications.
 */

import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  scheduleStreakReminder,
  sendLocalNotification,
  cancelAllNotifications,
} from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNotificationPermissions', () => {
    it('returns true if already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permissions if not granted, and returns true on grant', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('returns false if permission denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe('scheduleDailyReminder', () => {
    it('schedules a new daily reminder without cancelling on first call', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-123');

      const id = await scheduleDailyReminder(9, 30);

      // First call — no previous reminder to cancel
      expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Time to practice!',
          body: "Your cat misses you. Keep your streak alive!",
          sound: true,
        },
        trigger: {
          type: 'daily',
          hour: 9,
          minute: 30,
        },
      });
      expect(id).toBe('notif-123');
    });

    it('cancels only the previous daily reminder on subsequent calls', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock)
        .mockResolvedValueOnce('notif-first')
        .mockResolvedValueOnce('notif-second');

      // First call may cancel a leftover ID from a prior test (module-level state)
      await scheduleDailyReminder(9, 0);
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockClear();

      // Second call should cancel only the 'notif-first' reminder
      await scheduleDailyReminder(10, 30);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-first');
      expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });
  });

  describe('scheduleStreakReminder', () => {
    it('schedules a streak reminder at 8pm', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('streak-456');

      const id = await scheduleStreakReminder();

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Streak at risk!',
          }),
          trigger: expect.objectContaining({
            hour: 20,
            minute: 0,
          }),
        }),
      );
      expect(id).toBe('streak-456');
    });
  });

  describe('sendLocalNotification', () => {
    it('sends an immediate notification with null trigger', async () => {
      await sendLocalNotification('Test Title', 'Test Body');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: { title: 'Test Title', body: 'Test Body', sound: true },
        trigger: null,
      });
    });
  });

  describe('cancelAllNotifications', () => {
    it('cancels all scheduled notifications', async () => {
      await cancelAllNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });
  });
});
