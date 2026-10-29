
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  scheduleHabitReminder,
  cancelHabitReminder,
} from "@/utils/notifications";

const API_URL = "https://habit-tracker-n3gw.onrender.com";
const HABITS_URL = `${API_URL}/api/habits`;

export type HabitCategory =
  | "Health"
  | "Fitness"
  | "Study"
  | "Work"
  | "Personal"
  | "Other";

export type HabitFrequency =
  | "Daily"
  | "Weekdays"
  | "Weekends"
  | "Custom";

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  customDays: string[];
  completed: boolean;
  completedDates: string[];
  missedDates?: string[];
  reminderTime?: string | null;
  archived: boolean;
  currentStreak?: number;
  bestStreak?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AddHabitData {
  name: string;
  description?: string;
  category?: HabitCategory;
  frequency?: HabitFrequency;
  customDays?: string[];
  reminderTime?: string | null;
  [key: string]: unknown;
}

interface HabitContextType {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  refreshHabits: () => Promise<void>;
  addHabit: (data: AddHabitData) => Promise<Habit>;
  updateHabit: (
    id: string,
    updates: Partial<AddHabitData>
  ) => Promise<Habit>;
  updateHabitDetails: (
    id: string,
    updates: Partial<AddHabitData>
  ) => Promise<Habit>;
  toggleHabit: (id: string, date?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  updateHabitName: (id: string, name: string) => Promise<void>;
  updateHabitReminder: (
    id: string,
    reminderTime: string | null
  ) => Promise<void>;
  archiveHabit: (id: string, archived: boolean) => Promise<void>;
  unarchiveHabit: (id: string) => Promise<void>;
  getCurrentStreak: (habit: Habit) => number;
  getBestStreak: (habit: Habit) => number;
}

const HabitContext = createContext<HabitContextType | undefined>(
  undefined
);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return {};
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}. The server did not return JSON.`
      );
    }
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function extractHabits(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  if (Array.isArray(data.habits)) return data.habits;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;

  if (isRecord(data.data)) {
    if (Array.isArray(data.data.habits)) return data.data.habits;
    if (Array.isArray(data.data.data)) return data.data.data;
  }

  if (isRecord(data.results) && Array.isArray(data.results.habits)) {
    return data.results.habits;
  }

  return [];
}

function extractHabit(data: unknown): UnknownRecord | null {
  if (!isRecord(data)) return null;

  if (isRecord(data.habit)) return data.habit;

  if (isRecord(data.data)) {
    if (isRecord(data.data.habit)) return data.data.habit;

    if ("_id" in data.data || "id" in data.data) {
      return data.data;
    }
  }

  if ("_id" in data || "id" in data) return data;

  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayString(): string {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatHabit(value: unknown): Habit {
  const habit: UnknownRecord = isRecord(value) ? value : {};

  const id = String(habit._id ?? habit.id ?? "");
  const name = String(habit.name ?? habit.title ?? "Untitled habit");

  const allowedCategories: HabitCategory[] = [
    "Health",
    "Fitness",
    "Study",
    "Work",
    "Personal",
    "Other",
  ];

  const rawCategory = String(habit.category ?? "Personal");
  const category: HabitCategory = allowedCategories.includes(
    rawCategory as HabitCategory
  )
    ? (rawCategory as HabitCategory)
    : "Personal";

  const allowedFrequencies: HabitFrequency[] = [
    "Daily",
    "Weekdays",
    "Weekends",
    "Custom",
  ];

  const rawFrequency = String(habit.frequency ?? "Daily");
  const frequency: HabitFrequency = allowedFrequencies.includes(
    rawFrequency as HabitFrequency
  )
    ? (rawFrequency as HabitFrequency)
    : "Daily";

  const customDays: string[] = Array.isArray(habit.customDays)
    ? habit.customDays.filter(
        (day: unknown): day is string => typeof day === "string"
      )
    : [];

  const completedDates: string[] = Array.isArray(habit.completedDates)
    ? habit.completedDates
        .filter(
          (date: unknown): date is string => typeof date === "string"
        )
        .map((date) => normalizeDate(date))
        .filter((date): date is string => date !== null)
    : [];

  const missedDates: string[] = Array.isArray(habit.missedDates)
    ? habit.missedDates
        .filter(
          (date: unknown): date is string => typeof date === "string"
        )
        .map((date) => normalizeDate(date))
        .filter((date): date is string => date !== null)
    : [];

  return {
    ...habit,
    id,
    name,
    description:
      typeof habit.description === "string" ? habit.description : "",
    category,
    frequency,
    customDays,
    completedDates,
    missedDates,
    completed: completedDates.includes(todayString()),
    reminderTime:
      typeof habit.reminderTime === "string"
        ? habit.reminderTime
        : null,
    archived: Boolean(habit.archived),
    currentStreak:
      typeof habit.currentStreak === "number" ? habit.currentStreak : 0,
    bestStreak:
      typeof habit.bestStreak === "number" ? habit.bestStreak : 0,
  } as Habit;
}

async function apiRequest(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<unknown> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  return readResponse(response);
}

function getSortedDates(habit: Habit): string[] {
  return [...new Set(habit.completedDates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
}

function calculateCurrentStreak(habit: Habit): number {
  const dates = new Set(getSortedDates(habit));
  const cursor = new Date();

  if (!dates.has(todayString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (true) {
    const date = `${cursor.getFullYear()}-${String(
      cursor.getMonth() + 1
    ).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

    if (!dates.has(date)) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function calculateBestStreak(habit: Habit): number {
  const dates = getSortedDates(habit);

  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T12:00:00`);
    const currentDate = new Date(`${dates[index]}T12:00:00`);

    const difference = Math.round(
      (currentDate.getTime() - previous.getTime()) / 86400000
    );

    if (difference === 1) {
      current += 1;
      best = Math.max(best, current);
    } else if (difference > 1) {
      current = 1;
    }
  }

  return best;
}

interface HabitProviderProps {
  children: ReactNode;
}

export function HabitProvider({ children }: HabitProviderProps) {
  const { user, token, loading: authLoading } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHabits = useCallback(async (): Promise<void> => {
    if (authLoading) return;

    if (!token) {
      setHabits([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(HABITS_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readResponse(response);
      const formatted = extractHabits(data)
        .map(formatHabit)
        .filter((habit) => habit.id.length > 0);

      setHabits(formatted);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("LOAD HABITS ERROR:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    void refreshHabits();
  }, [refreshHabits, user?.id]);

  const addHabit = useCallback(
    async (data: AddHabitData): Promise<Habit> => {
      if (!token) {
        throw new Error("Please log in to add a habit.");
      }

      const result = await apiRequest(HABITS_URL, token, {
        method: "POST",
        body: JSON.stringify(data),
      });

      const rawHabit = extractHabit(result);

      if (!rawHabit) {
        await refreshHabits();
        throw new Error(
          "The habit may have been saved, but the server did not return it. Refresh your list."
        );
      }

      const newHabit = formatHabit(rawHabit);

      setHabits((previous) => [
        ...previous.filter((habit) => habit.id !== newHabit.id),
        newHabit,
      ]);

      if (newHabit.reminderTime) {
        try {
          await scheduleHabitReminder(
            newHabit.id,
            newHabit.name,
            newHabit.reminderTime
          );
        } catch (err) {
          console.warn("Could not schedule habit reminder:", err);
        }
      }

      return newHabit;
    },
    [token, refreshHabits]
  );

  const updateHabit = useCallback(
    async (
      id: string,
      updates: Partial<AddHabitData>
    ): Promise<Habit> => {
      if (!token) {
        throw new Error("Please log in to update a habit.");
      }

      const result = await apiRequest(
        `${HABITS_URL}/${encodeURIComponent(id)}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify(updates),
        }
      );

      const rawHabit = extractHabit(result);

      if (rawHabit) {
        const updatedHabit = formatHabit(rawHabit);

        setHabits((previous) =>
          previous.map((habit) =>
            habit.id === id ? updatedHabit : habit
          )
        );

        if (updatedHabit.reminderTime) {
          try {
            await scheduleHabitReminder(
              updatedHabit.id,
              updatedHabit.name,
              updatedHabit.reminderTime
            );
          } catch (err) {
            console.warn("Could not update habit reminder:", err);
          }
        } else {
          try {
            await cancelHabitReminder(id);
          } catch (err) {
            console.warn("Could not cancel habit reminder:", err);
          }
        }

        return updatedHabit;
      }

      await refreshHabits();

      const updated = habits.find((habit) => habit.id === id);

      if (updated) {
        return { ...updated, ...updates } as Habit;
      }

      throw new Error("The server did not return the updated habit.");
    },
    [token, habits, refreshHabits]
  );

  const updateHabitDetails = useCallback(
    async (
      id: string,
      updates: Partial<AddHabitData>
    ): Promise<Habit> => updateHabit(id, updates),
    [updateHabit]
  );

  const toggleHabit = useCallback(
    async (id: string, date: string = todayString()): Promise<void> => {
      if (!token) {
        throw new Error("Please log in to update a habit.");
      }

      const normalizedDate = normalizeDate(date);

      if (!normalizedDate) {
        throw new Error("Invalid completion date.");
      }

      const existingHabit = habits.find((habit) => habit.id === id);

      if (!existingHabit) {
        throw new Error("Habit not found.");
      }

      const wasCompleted =
        existingHabit.completedDates.includes(normalizedDate);

      const updatedDates = wasCompleted
        ? existingHabit.completedDates.filter(
            (item) => item !== normalizedDate
          )
        : [...existingHabit.completedDates, normalizedDate];

      setHabits((previous) =>
        previous.map((habit) =>
          habit.id === id
            ? {
                ...habit,
                completedDates: updatedDates,
                completed: updatedDates.includes(todayString()),
              }
            : habit
        )
      );

      try {
        const result = await apiRequest(
          `${HABITS_URL}/${encodeURIComponent(id)}/toggle`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify({ date: normalizedDate }),
          }
        );

        const rawHabit = extractHabit(result);

        if (rawHabit) {
          const updatedHabit = formatHabit(rawHabit);

          setHabits((previous) =>
            previous.map((habit) =>
              habit.id === id ? updatedHabit : habit
            )
          );
        }
      } catch (err) {
        setHabits((previous) =>
          previous.map((habit) =>
            habit.id === id ? existingHabit : habit
          )
        );

        throw new Error(getErrorMessage(err));
      }
    },
    [token, habits]
  );

  const deleteHabit = useCallback(
    async (id: string): Promise<void> => {
      if (!token) {
        throw new Error("Please log in to delete a habit.");
      }

      await apiRequest(
        `${HABITS_URL}/${encodeURIComponent(id)}`,
        token,
        { method: "DELETE" }
      );

      setHabits((previous) =>
        previous.filter((habit) => habit.id !== id)
      );

      try {
        await cancelHabitReminder(id);
      } catch (err) {
        console.warn("Could not cancel deleted habit reminder:", err);
      }
    },
    [token]
  );

  const updateHabitName = useCallback(
    async (id: string, name: string): Promise<void> => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        throw new Error("Habit name cannot be empty.");
      }

      await updateHabit(id, { name: trimmedName });
    },
    [updateHabit]
  );

  const updateHabitReminder = useCallback(
    async (
      id: string,
      reminderTime: string | null
    ): Promise<void> => {
      await updateHabit(id, { reminderTime });
    },
    [updateHabit]
  );

  const archiveHabit = useCallback(
    async (id: string, archived: boolean): Promise<void> => {
      if (!token) {
        throw new Error("Please log in to update a habit.");
      }

      const endpoint = archived ? "archive" : "unarchive";

      const result = await apiRequest(
        `${HABITS_URL}/${encodeURIComponent(id)}/${endpoint}`,
        token,
        { method: "PUT" }
      );

      const rawHabit = extractHabit(result);
      const existingHabit = habits.find((habit) => habit.id === id);

      const updatedHabit = rawHabit
        ? formatHabit(rawHabit)
        : existingHabit
          ? { ...existingHabit, archived }
          : undefined;

      if (updatedHabit) {
        setHabits((previous) =>
          previous.map((habit) =>
            habit.id === id ? updatedHabit : habit
          )
        );
      } else {
        await refreshHabits();
      }

      if (archived) {
        try {
          await cancelHabitReminder(id);
        } catch (err) {
          console.warn("Could not cancel archived habit reminder:", err);
        }
      } else if (updatedHabit?.reminderTime) {
        try {
          await scheduleHabitReminder(
            updatedHabit.id,
            updatedHabit.name,
            updatedHabit.reminderTime
          );
        } catch (err) {
          console.warn("Could not reschedule habit reminder:", err);
        }
      }
    },
    [token, habits, refreshHabits]
  );

  const unarchiveHabit = useCallback(
    async (id: string): Promise<void> => {
      await archiveHabit(id, false);
    },
    [archiveHabit]
  );

  const getCurrentStreak = useCallback(
    (habit: Habit): number => calculateCurrentStreak(habit),
    []
  );

  const getBestStreak = useCallback(
    (habit: Habit): number =>
      Math.max(calculateBestStreak(habit), habit.bestStreak ?? 0),
    []
  );

  const contextValue = useMemo<HabitContextType>(
    () => ({
      habits,
      loading,
      error,
      refreshHabits,
      addHabit,
      updateHabit,
      updateHabitDetails,
      toggleHabit,
      deleteHabit,
      updateHabitName,
      updateHabitReminder,
      archiveHabit,
      unarchiveHabit,
      getCurrentStreak,
      getBestStreak,
    }),
    [
      habits,
      loading,
      error,
      refreshHabits,
      addHabit,
      updateHabit,
      updateHabitDetails,
      toggleHabit,
      deleteHabit,
      updateHabitName,
      updateHabitReminder,
      archiveHabit,
      unarchiveHabit,
      getCurrentStreak,
      getBestStreak,
    ]
  );

  return (
    <HabitContext.Provider value={contextValue}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits(): HabitContextType {
  const context = useContext(HabitContext);

  if (!context) {
    throw new Error("useHabits must be used inside a HabitProvider.");
  }

  return context;
}
