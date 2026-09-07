
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { useAuth } from "@/context/AuthContext";

import {
  scheduleHabitReminder,
  cancelHabitReminder,
} from "@/utils/notifications";

// =====================================================
// TYPES
// =====================================================

export type Habit = {
  id: string;

  name: string;

  description: string;

  category:
    | "Health"
    | "Fitness"
    | "Study"
    | "Work"
    | "Personal"
    | "Other";

  frequency:
    | "Daily"
    | "Weekdays"
    | "Weekends"
    | "Custom";

  customDays: string[];

  completed: boolean;

  completedDates: string[];

  reminderTime: string | null;

  archived: boolean;
};

export type AddHabitData = {
  name: string;

  description?: string;

  category?:
    | "Health"
    | "Fitness"
    | "Study"
    | "Work"
    | "Personal"
    | "Other";

  frequency?:
    | "Daily"
    | "Weekdays"
    | "Weekends"
    | "Custom";

  customDays?: string[];

  reminderTime?: string | null;
};

type HabitContextType = {
  habits: Habit[];

  addHabit: (
    data: AddHabitData | string,
    reminderTime?: string | null
  ) => Promise<Habit>;

  toggleHabit: (
    id: string
  ) => Promise<void>;

  deleteHabit: (
    id: string
  ) => Promise<void>;

  editHabit: (
    id: string,
    name: string
  ) => Promise<void>;

  updateReminder: (
    id: string,
    reminderTime: string | null
  ) => Promise<void>;

  updateHabitDetails: (
    id: string,
    data: Partial<AddHabitData>
  ) => Promise<void>;

  archiveHabit: (
    id: string,
    archived: boolean
  ) => Promise<void>;

  getCurrentStreak: (
    habit: Habit
  ) => number;

  getBestStreak: (
    habit: Habit
  ) => number;
};

// =====================================================
// CONTEXT
// =====================================================

const HabitContext =
  createContext<HabitContextType | undefined>(
    undefined
  );

// =====================================================
// API
// =====================================================

const API_URL = 'http://192.168.1.66:5000';

// =====================================================
// DATE HELPERS
// =====================================================

const getToday = (): string => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (
  date: Date
): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// =====================================================
// FORMAT HABIT
// =====================================================

const formatHabit = (
  habit: any
): Habit => {
  const completedDates =
    Array.isArray(habit?.completedDates)
      ? habit.completedDates.map(String)
      : [];

  return {
    id: String(
      habit?._id || habit?.id || ""
    ),

    name:
      habit?.name ||
      "Habit",

    description:
      habit?.description ||
      "",

    category:
      habit?.category ||
      "Personal",

    frequency:
      habit?.frequency ||
      "Daily",

    customDays:
      Array.isArray(habit?.customDays)
        ? habit.customDays
        : [],

    completed:
      completedDates.includes(
        getToday()
      ),

    completedDates,

    reminderTime:
      habit?.reminderTime ||
      null,

    archived:
      habit?.archived === true,
  };
};

// =====================================================
// PROVIDER
// =====================================================

export function HabitProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    token,
    loading: authLoading,
  } = useAuth();

  const [
    habits,
    setHabits,
  ] = useState<Habit[]>([]);

  // ===================================================
  // LOAD HABITS
  // ===================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !token) {
      setHabits([]);
      return;
    }

    let cancelled = false;

    const loadHabits = async () => {
      try {
        console.log(
          "LOADING HABITS..."
        );

        const response =
          await fetch(
            `${API_URL}/api/habits`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to load habits"
          );
        }

        const serverHabits =
          Array.isArray(
            data?.habits
          )
            ? data.habits
            : [];

        const formatted =
          serverHabits.map(
            formatHabit
          );

        if (cancelled) {
          return;
        }

        setHabits(formatted);

        console.log(
          "HABITS LOADED:",
          formatted.length
        );

        // Restore reminders
        for (const habit of formatted) {
          if (
            habit.reminderTime &&
            !habit.archived
          ) {
            try {
              await scheduleHabitReminder(
                habit.id,
                habit.name,
                habit.reminderTime
              );
            } catch (notificationError) {
              console.error(
                "REMINDER RESTORE ERROR:",
                notificationError
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "LOAD HABITS ERROR:",
          error
        );
      }
    };

    loadHabits();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    token,
    user?.id,
  ]);

  // ===================================================
  // ADD HABIT
  // ===================================================

  const addHabit = async (
    data: AddHabitData | string,
    oldReminderTime:
      string | null = null
  ): Promise<Habit> => {
    let habitData: AddHabitData;

    // Support old API:
    // addHabit("Drink water", "09:00")
    if (typeof data === "string") {
      habitData = {
        name: data,
        reminderTime:
          oldReminderTime,
      };
    } else {
      habitData = data;
    }

    const trimmedName =
      habitData.name.trim();

    if (!trimmedName) {
      throw new Error(
        "Habit name is required"
      );
    }

    if (!token) {
      throw new Error(
        "You are not logged in"
      );
    }

    console.log(
      "CREATING HABIT:",
      habitData
    );

    const response =
      await fetch(
        `${API_URL}/api/habits`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: trimmedName,

            description:
              habitData.description?.trim() ||
              "",

            category:
              habitData.category ||
              "Personal",

            frequency:
              habitData.frequency ||
              "Daily",

            customDays:
              habitData.customDays ||
              [],

            reminderTime:
              habitData.reminderTime ||
              null,
          }),
        }
      );

    let result: any;

    try {
      result =
        await response.json();
    } catch {
      throw new Error(
        "Server returned invalid response"
      );
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          `Failed to create habit (${response.status})`
      );
    }

    if (!result?.habit) {
      throw new Error(
        "Server did not return created habit"
      );
    }

    const newHabit =
      formatHabit(
        result.habit
      );

    setHabits(
      current => [
        newHabit,
        ...current,
      ]
    );

    // =================================================
    // SCHEDULE NOTIFICATION
    // =================================================

    if (
      newHabit.reminderTime &&
      !newHabit.archived
    ) {
      try {
        await scheduleHabitReminder(
          newHabit.id,
          newHabit.name,
          newHabit.reminderTime
        );
      } catch (error) {
        console.error(
          "SCHEDULE NEW HABIT REMINDER ERROR:",
          error
        );
      }
    }

    console.log(
      "HABIT CREATED:",
      newHabit
    );

    // IMPORTANT:
    // AddHabitScreen needs this object
    return newHabit;
  };

  // ===================================================
  // UPDATE HABIT DETAILS
  // ===================================================

  const updateHabitDetails =
    async (
      id: string,
      data: Partial<AddHabitData>
    ): Promise<void> => {
      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      const oldHabit =
        habits.find(
          habit =>
            habit.id === id
        );

      if (!oldHabit) {
        throw new Error(
          "Habit not found"
        );
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/habits/${id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(data),
            }
          );

        let result: any;

        try {
          result =
            await response.json();
        } catch {
          throw new Error(
            "Server returned invalid response"
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Failed to update habit"
          );
        }

        if (!result?.habit) {
          throw new Error(
            "Server did not return updated habit"
          );
        }

        const updatedHabit =
          formatHabit(
            result.habit
          );

        setHabits(
          current =>
            current.map(
              habit =>
                habit.id === id
                  ? updatedHabit
                  : habit
            )
        );

        // =================================================
        // UPDATE NOTIFICATION
        // =================================================

        if (
          updatedHabit.reminderTime &&
          !updatedHabit.archived
        ) {
          try {
            await scheduleHabitReminder(
              updatedHabit.id,
              updatedHabit.name,
              updatedHabit.reminderTime
            );
          } catch (error) {
            console.error(
              "UPDATE REMINDER ERROR:",
              error
            );
          }
        } else {
          try {
            await cancelHabitReminder(
              updatedHabit.id
            );
          } catch (error) {
            console.error(
              "CANCEL UPDATED REMINDER ERROR:",
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "UPDATE HABIT ERROR:",
          error
        );

        // Restore old state
        setHabits(
          current =>
            current.map(
              habit =>
                habit.id === id
                  ? oldHabit
                  : habit
            )
        );

        throw error;
      }
    };

  // ===================================================
  // UPDATE REMINDER
  // ===================================================

  const updateReminder =
    async (
      id: string,
      reminderTime:
        string | null
    ): Promise<void> => {
      await updateHabitDetails(
        id,
        {
          reminderTime,
        }
      );
    };

  // ===================================================
  // TOGGLE HABIT
  // ===================================================

  const toggleHabit =
    async (
      id: string
    ): Promise<void> => {
      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/habits/${id}/toggle`,
            {
              method: "PUT",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        let result: any;

        try {
          result =
            await response.json();
        } catch {
          throw new Error(
            "Server returned invalid response"
          );
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              "Failed to toggle habit"
          );
        }

        if (result?.habit) {
          const updated =
            formatHabit(
              result.habit
            );

          setHabits(
            current =>
              current.map(
                habit =>
                  habit.id === id
                    ? updated
                    : habit
              )
          );
        }
      } catch (error) {
        console.error(
          "TOGGLE ERROR:",
          error
        );

        throw error;
      }
    };

  // ===================================================
  // DELETE HABIT
  // ===================================================

  const deleteHabit =
    async (
      id: string
    ): Promise<void> => {
      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/habits/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      let result: any;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Server returned invalid response"
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to delete habit"
        );
      }

      try {
        await cancelHabitReminder(
          id
        );
      } catch (error) {
        console.error(
          "DELETE REMINDER ERROR:",
          error
        );
      }

      setHabits(
        current =>
          current.filter(
            habit =>
              habit.id !== id
          )
      );
    };

  // ===================================================
  // EDIT HABIT NAME
  // ===================================================

  const editHabit =
    async (
      id: string,
      name: string
    ): Promise<void> => {
      const trimmedName =
        name.trim();

      if (!trimmedName) {
        throw new Error(
          "Habit name is required"
        );
      }

      await updateHabitDetails(
        id,
        {
          name: trimmedName,
        }
      );
    };

  // ===================================================
  // ARCHIVE / UNARCHIVE
  // ===================================================

  const archiveHabit =
    async (
      id: string,
      archived: boolean
    ): Promise<void> => {
      if (!token) {
        throw new Error(
          "You are not logged in"
        );
      }

      const endpoint =
        archived
          ? `${API_URL}/api/habits/${id}/archive`
          : `${API_URL}/api/habits/${id}/unarchive`;

      const response =
        await fetch(
          endpoint,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      let result: any;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Server returned invalid response"
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to update archive status"
        );
      }

      if (result?.habit) {
        const updated =
          formatHabit(
            result.habit
          );

        setHabits(
          current =>
            current.map(
              habit =>
                habit.id === id
                  ? updated
                  : habit
            )
        );

        // Archived = cancel reminder
        if (archived) {
          try {
            await cancelHabitReminder(
              id
            );
          } catch (error) {
            console.error(
              "ARCHIVE REMINDER ERROR:",
              error
            );
          }
        }

        // Unarchived = restore reminder
        else if (
          updated.reminderTime
        ) {
          try {
            await scheduleHabitReminder(
              updated.id,
              updated.name,
              updated.reminderTime
            );
          } catch (error) {
            console.error(
              "UNARCHIVE REMINDER ERROR:",
              error
            );
          }
        }
      }
    };

  // ===================================================
  // CURRENT STREAK
  // ===================================================

  const getCurrentStreak =
    (
      habit: Habit
    ): number => {
      if (
        !habit.completedDates ||
        habit.completedDates.length === 0
      ) {
        return 0;
      }

      const completed =
        new Set(
          habit.completedDates
        );

      const today =
        new Date();

      let streak = 0;

      for (
        let i = 0;
        i < 10000;
        i++
      ) {
        const date =
          new Date(today);

        date.setDate(
          today.getDate() - i
        );

        const formatted =
          formatDate(date);

        if (
          completed.has(formatted)
        ) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    };

  // ===================================================
  // BEST STREAK
  // ===================================================

  const getBestStreak =
    (
      habit: Habit
    ): number => {
      if (
        !habit.completedDates ||
        habit.completedDates.length === 0
      ) {
        return 0;
      }

      const dates = [
        ...new Set(
          habit.completedDates
        ),
      ].sort();

      if (dates.length === 0) {
        return 0;
      }

      let best = 1;

      let current = 1;

      for (
        let i = 1;
        i < dates.length;
        i++
      ) {
        const previous =
          new Date(
            dates[i - 1]
          );

        const currentDate =
          new Date(
            dates[i]
          );

        const difference =
          Math.round(
            (
              currentDate.getTime() -
              previous.getTime()
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          );

        if (
          difference === 1
        ) {
          current++;

          best =
            Math.max(
              best,
              current
            );
        } else {
          current = 1;
        }
      }

      return best;
    };

  // ===================================================
  // PROVIDER
  // ===================================================

  return (
    <HabitContext.Provider
      value={{
        habits,

        addHabit,

        toggleHabit,

        deleteHabit,

        editHabit,

        updateReminder,

        updateHabitDetails,

        archiveHabit,

        getCurrentStreak,

        getBestStreak,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useHabits() {
  const context =
    useContext(
      HabitContext
    );

  if (!context) {
    throw new Error(
      "useHabits must be used inside HabitProvider"
    );
  }

  return context;
}

