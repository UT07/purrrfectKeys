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
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
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
    it('cancels only existing daily reminder and schedules a new one', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('purrrfect-daily-reminder');

      const id = await scheduleDailyReminder(9, 30);

      // Should cancel only the daily reminder by ID, NOT cancelAll
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('purrrfect-daily-reminder');
      expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: 'purrrfect-daily-reminder',
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
      expect(id).toBe('purrrfect-daily-reminder');
    });
  });

  describe('scheduleStreakReminder', () => {
    it('cancels only existing streak reminder and schedules a new one at 8pm', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('purrrfect-streak-reminder');

      const id = await scheduleStreakReminder();

      // Should cancel only the streak reminder by ID
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('purrrfect-streak-reminder');
      expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'purrrfect-streak-reminder',
          content: expect.objectContaining({
            title: 'Streak at risk!',
          }),
          trigger: expect.objectContaining({
            hour: 20,
            minute: 0,
          }),
        }),
      );
      expect(id).toBe('purrrfect-streak-reminder');
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
    it('cancels only app-managed notifications by identifier', async () => {
      await cancelAllNotifications();

      // Should cancel each known identifier individually
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('purrrfect-daily-reminder');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('purrrfect-streak-reminder');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      // Should NOT wipe all notifications
      expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    });
  });
});
