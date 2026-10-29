
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_TYPE = "habit-reminder";
const SOUND_STORAGE_KEY = "@habit_tracker_notification_sound";

export const NOTIFICATION_SOUNDS = [
  {
    id: "soft-chime",
    name: "Soft Chime",
    description: "A gentle two-note reminder",
    file: "habit-reminder.wav",
  },
  {
    id: "classic-bell",
    name: "Classic Bell",
    description: "A clear, bright bell",
    file: "classic-bell.wav",
  },
  {
    id: "morning-wakeup",
    name: "Morning Wake-Up",
    description: "A cheerful ascending chime",
    file: "morning-wakeup.wav",
  },
  {
    id: "nature-tone",
    name: "Nature Tone",
    description: "A soft, relaxing tone",
    file: "nature-tone.wav",
  },
  {
    id: "alarm-tone",
    name: "Alarm Tone",
    description: "A more noticeable alarm sound",
    file: "alarm-tone.wav",
  },
] as const;

export type NotificationSoundId =
  (typeof NOTIFICATION_SOUNDS)[number]["id"];

const DEFAULT_SOUND: NotificationSoundId = "soft-chime";

function getSoundConfig(soundId: string) {
  return (
    NOTIFICATION_SOUNDS.find((sound) => sound.id === soundId) ??
    NOTIFICATION_SOUNDS[0]
  );
}

function getChannelId(soundId: NotificationSoundId): string {
  // Keep a different channel for each sound on Android.
  return `habit-reminders-${soundId}-v1`;
}

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Read the saved sound preference.
export async function getNotificationSound(): Promise<NotificationSoundId> {
  try {
    const saved = await AsyncStorage.getItem(SOUND_STORAGE_KEY);

    if (saved && NOTIFICATION_SOUNDS.some((sound) => sound.id === saved)) {
      return saved as NotificationSoundId;
    }
  } catch (error) {
    console.error("Failed to read notification sound:", error);
  }

  return DEFAULT_SOUND;
}

// Create the Android channel for the selected sound.
async function ensureNotificationChannel(
  soundId: NotificationSoundId
): Promise<string | undefined> {
  if (Platform.OS !== "android") {
    return undefined;
  }

  const sound = getSoundConfig(soundId);
  const channelId = getChannelId(sound.id);

  await Notifications.setNotificationChannelAsync(channelId, {
    name: `Habit reminders - ${sound.name}`,
    description: `Habit reminders using ${sound.name}`,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: sound.file,
  });

  return channelId;
}

// Save the selected sound and prepare its Android channel.
export async function setNotificationSound(
  soundId: NotificationSoundId
): Promise<boolean> {
  try {
    const sound = NOTIFICATION_SOUNDS.find((item) => item.id === soundId);

    if (!sound) {
      throw new Error(`Unsupported notification sound: ${soundId}`);
    }

    await AsyncStorage.setItem(SOUND_STORAGE_KEY, soundId);
    await ensureNotificationChannel(soundId);

    return true;
  } catch (error) {
    console.error("Failed to update notification sound:", error);
    return false;
  }
}

// Request notification permission and prepare the selected sound.
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();

    let permitted =
      current.granted ||
      current.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!permitted) {
      const requested = await Notifications.requestPermissionsAsync();

      permitted =
        requested.granted ||
        requested.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL;
    }

    if (!permitted) {
      return false;
    }

    const soundId = await getNotificationSound();
    await ensureNotificationChannel(soundId);

    return true;
  } catch (error) {
    console.error("Notification permission error:", error);
    return false;
  }
}

// Schedule a daily reminder using the device's local time.
// reminderTime must use HH:mm format, such as "18:45".
export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  reminderTime: string
): Promise<string | null> {
  try {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime);

    if (!match) {
      throw new Error(
        `Invalid reminder time: ${reminderTime}. Expected HH:mm.`
      );
    }

    const permitted = await requestNotificationPermission();

    if (!permitted) {
      console.warn("Reminder not scheduled: permission was denied.");
      return null;
    }

    const soundId = await getNotificationSound();
    const sound = getSoundConfig(soundId);
    const channelId = await ensureNotificationChannel(soundId);

    // Prevent duplicate reminders for this habit.
    await cancelHabitReminder(habitId);

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for ${habitName}`,
        body: "It's time to work on your habit. Small steps count!",
        sound: sound.file,
        data: {
          habitId,
          type: REMINDER_TYPE,
          soundId: sound.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(channelId ? { channelId } : {}),
      },
    });

    console.log("Habit reminder scheduled:", {
      habitId,
      habitName,
      reminderTime,
      sound: sound.name,
      identifier,
    });

    return identifier;
  } catch (error) {
    console.error("Failed to schedule habit reminder:", error);
    return null;
  }
}

// Cancel the reminder belonging to one habit.
export async function cancelHabitReminder(
  habitId: string
): Promise<void> {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      const data = notification.content.data;

      if (
        data?.habitId === habitId &&
        data?.type === REMINDER_TYPE
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Failed to cancel habit reminder:", error);
  }
}

// Cancel only reminders created by this habit tracker.
export async function cancelAllHabitReminders(): Promise<void> {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      if (notification.content.data?.type === REMINDER_TYPE) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Failed to cancel habit reminders:", error);
  }
}

// Read the currently scheduled habit reminders.
export async function getScheduledHabitReminders(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();

    return scheduled.filter(
      (notification) =>
        notification.content.data?.type === REMINDER_TYPE
    );
  } catch (error) {
    console.error("Failed to read scheduled reminders:", error);
    return [];
  }
}
