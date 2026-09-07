
import { Platform } from "react-native";

/*
=====================================================
HABIT NOTIFICATIONS

IMPORTANT:
Android Expo Go does NOT support expo-notifications
remote notification functionality on SDK 53+.

Therefore this file intentionally does NOT import
expo-notifications while we are testing in Expo Go.

Once the application is stable, we will enable
real Android notifications using an Expo
development build.
=====================================================
*/

// =====================================================
// REQUEST PERMISSION
// =====================================================

export async function requestNotificationPermission(): Promise<boolean> {
  console.log(
    "⚠️ Notifications are temporarily disabled in Expo Go."
  );

  console.log(
    "Platform:",
    Platform.OS
  );

  return false;
}

// =====================================================
// SCHEDULE DAILY REMINDER
// =====================================================

export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  reminderTime: string
): Promise<string | null> {
  console.log(
    "⚠️ Notification scheduling skipped in Expo Go."
  );

  console.log(
    "Habit:",
    habitName
  );

  console.log(
    "Habit ID:",
    habitId
  );

  console.log(
    "Reminder time:",
    reminderTime
  );

  return null;
}

// =====================================================
// CANCEL ONE HABIT REMINDER
// =====================================================

export async function cancelHabitReminder(
  habitId: string
): Promise<void> {
  console.log(
    "⚠️ Cancel notification skipped in Expo Go."
  );

  console.log(
    "Habit ID:",
    habitId
  );
}

// =====================================================
// CANCEL ALL HABIT REMINDERS
// =====================================================

export async function cancelAllHabitReminders(): Promise<void> {
  console.log(
    "⚠️ Cancel all notifications skipped in Expo Go."
  );
}

// =====================================================
// GET SCHEDULED REMINDERS
// =====================================================

export async function getScheduledHabitReminders(): Promise<any[]> {
  console.log(
    "⚠️ Reading scheduled notifications skipped in Expo Go."
  );

  return [];
}

