
"use strict";

const Habit = require("../models/Habit");

const {
  dateKey,
  addDays,
  isScheduled,
  getOutcomeSets,
} = require("../ml/sharedData");

const RECENT_WINDOW_DAYS = 7;
const MAX_STREAK_LOOKBACK_DAYS = 3650;
const MIN_RECENT_RECORDS_FOR_STRONG_FEEDBACK = 3;

// -----------------------------------------------------
// RECORDED HISTORY
// -----------------------------------------------------

function getKnownHistory(habit) {
  const outcomes = getOutcomeSets(habit) || {};
  const completed = outcomes.completed || new Set();
  const missed = outcomes.missed || new Set();

  const missedOnly = new Set(
    [...missed].filter((day) => !completed.has(day))
  );

  const totalRecorded = completed.size + missedOnly.size;

  return {
    completed,
    missed: missedOnly,
    totalRecorded,
    completionRate:
      totalRecorded > 0
        ? completed.size / totalRecorded
        : null,
  };
}

// -----------------------------------------------------
// TODAY'S STATUS
// -----------------------------------------------------

function getTodayStatus(habit, history) {
  const today = dateKey(new Date());

  if (!today || !isScheduled(habit, today)) {
    return {
      key: "not_scheduled",
      label: "Not scheduled today",
      date: today || null,
    };
  }

  if (history.completed.has(today)) {
    return {
      key: "completed",
      label: "Completed",
      date: today,
    };
  }

  if (history.missed.has(today)) {
    return {
      key: "missed",
      label: "Missed",
      date: today,
    };
  }

  // Never automatically mark the current day as missed.
  return {
    key: "pending",
    label: "Pending",
    date: today,
  };
}

// -----------------------------------------------------
// RECENT HISTORY
// -----------------------------------------------------

function getRecentHistory(
  habit,
  history,
  days = RECENT_WINDOW_DAYS
) {
  const completed = [];
  const missed = [];
  const unknown = [];

  const today = dateKey(new Date());

  if (!today || !Number.isInteger(days) || days <= 0) {
    return {
      windowDays: days,
      scheduledDays: 0,
      completedDays: 0,
      missedDays: 0,
      unknownDays: 0,
      recordedDays: 0,
      completionRate: null,
    };
  }

  const createdDate =
    dateKey(habit.createdAt) ||
    dateKey(habit.startDate);

  for (let offset = days - 1; offset >= 0; offset--) {
    const key = addDays(today, -offset);

    if (!key) continue;
    if (createdDate && key < createdDate) continue;
    if (!isScheduled(habit, key)) continue;

    if (history.completed.has(key)) {
      completed.push(key);
    } else if (history.missed.has(key)) {
      missed.push(key);
    } else {
      unknown.push(key);
    }
  }

  const recordedDays = completed.length + missed.length;

  return {
    windowDays: days,
    scheduledDays: recordedDays + unknown.length,
    completedDays: completed.length,
    missedDays: missed.length,
    unknownDays: unknown.length,
    recordedDays,
    completionRate:
      recordedDays > 0
        ? completed.length / recordedDays
        : null,
  };
}

// -----------------------------------------------------
// CURRENT STREAK
// -----------------------------------------------------

function getStreak(habit, history) {
  const today = dateKey(new Date());

  if (!today) return 0;

  const createdDate =
    dateKey(habit.createdAt) ||
    dateKey(habit.startDate);

  let streak = 0;

  const todayIsScheduled = isScheduled(habit, today);
  const todayIsCompleted = history.completed.has(today);
  const todayIsMissed = history.missed.has(today);

  let offset = 0;

  // An unrecorded scheduled day today is still pending.
  if (
    todayIsScheduled &&
    !todayIsCompleted &&
    !todayIsMissed
  ) {
    offset = 1;
  }

  for (
    let checked = 0;
    checked < MAX_STREAK_LOOKBACK_DAYS;
    checked++, offset++
  ) {
    const key = addDays(today, -offset);

    if (!key) break;
    if (createdDate && key < createdDate) break;
    if (!isScheduled(habit, key)) continue;

    if (history.completed.has(key)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// -----------------------------------------------------
// PERSONALIZED PERFORMANCE TIPS
// -----------------------------------------------------

function getFeedback(habit, metrics, recent, streak, todayStatus) {
  const title = habit.name || "This habit";
  const tips = [];

  if (metrics.totalRecorded === 0) {
    return {
      status: "needs_more_history",
      headline: "Start building your habit history",
      message:
        `${title} does not have recorded completed or missed days yet. ` +
        "There is not enough history to identify a reliable performance trend.",
      action:
        "Complete your next scheduled session and record the result. " +
        "Record missed sessions honestly too.",
      motivation:
        "Start small. Every honest check-in helps you understand your routine.",
      tips: [
        "Choose a specific time for this habit.",
        "Begin with a small, achievable target.",
        "Record each scheduled session so future reviews are more useful.",
      ],
    };
  }

  const recentRecorded =
    recent.completedDays + recent.missedDays;

  const recentRate = recent.completionRate;
  const overallRate = metrics.completionRate;

  if (recent.missedDays >= 2) {
    tips.push(
      "Reduce the habit to a version you can finish in 5–10 minutes."
    );
    tips.push(
      "Choose a consistent time and prepare anything you need beforehand."
    );
    tips.push(
      "Look for a pattern in missed sessions, such as a busy day or an inconvenient time."
    );
  } else if (
    recentRate !== null &&
    recentRate < 0.5 &&
    recentRecorded >= MIN_RECENT_RECORDS_FOR_STRONG_FEEDBACK
  ) {
    tips.push(
      "Make your next session easier to start by setting a smaller minimum goal."
    );
    tips.push(
      "Attach the habit to an existing routine, such as after breakfast or after class."
    );
  } else if (
    recentRate !== null &&
    recentRate >= 0.8 &&
    recentRecorded >= MIN_RECENT_RECORDS_FOR_STRONG_FEEDBACK
  ) {
    tips.push(
      "Keep using the time and routine that have been working for you."
    );
    tips.push(
      "Maintain your current target before increasing its difficulty."
    );
  } else {
    tips.push(
      "Set a clear time and a small target for your next scheduled session."
    );
    tips.push(
      "Review your check-ins at the end of the week to identify what helps you succeed."
    );
  }

  if (
    overallRate !== null &&
    recentRate !== null &&
    recentRate > overallRate + 0.1
  ) {
    tips.push(
      "Your recent completion rate is better than your overall rate. Keep repeating the recent routine that is helping you improve."
    );
  } else if (
    overallRate !== null &&
    recentRate !== null &&
    recentRate < overallRate - 0.1
  ) {
    tips.push(
      "Your recent performance is below your overall history. Check whether your schedule or target has become harder to manage."
    );
  }

  if (streak >= 3) {
    tips.push(
      `Protect your ${streak}-day streak by planning the next session in advance.`
    );
  } else if (streak === 0 && recent.missedDays > 0) {
    tips.push(
      "Restart with the next scheduled session. A missed session does not erase your earlier progress."
    );
  }

  if (todayStatus.key === "pending") {
    tips.unshift(
      "Today's session is still pending. Complete it and record the result before the day ends."
    );
  } else if (todayStatus.key === "completed") {
    tips.unshift(
      "Today's session is complete. Keep the rest of your routine realistic and sustainable."
    );
  } else if (todayStatus.key === "missed") {
    tips.unshift(
      "Today's session is recorded as missed. Plan a manageable next session instead of trying to make up everything at once."
    );
  }

  let status = "build_consistency";
  let headline = "Focus on steady progress";
  let message =
    "Use your recorded activity to build a routine that fits your life.";

  if (
    recentRate !== null &&
    recentRate >= 0.8 &&
    recentRecorded >= MIN_RECENT_RECORDS_FOR_STRONG_FEEDBACK
  ) {
    status = "strong_consistency";
    headline = "You're building consistency";
    message =
      `You completed ${recent.completedDays} of ${recentRecorded} ` +
      "recorded scheduled days in the recent review period.";
  } else if (recent.missedDays >= 2) {
    status = "needs_attention";
    headline = "Let's make this habit easier";
    message =
      `${recent.missedDays} scheduled days were recorded as missed ` +
      "in the recent review period. Treat this as useful information, not a judgment.";
  } else if (streak > 0) {
    status = "keep_momentum";
    headline = "Keep your momentum";
    message =
      `Your current streak is ${streak} scheduled day(s), based on recorded completions.`;
  }

  return {
    status,
    headline,
    message,
    action: tips[0],
    motivation:
      recentRate !== null && recentRate >= 0.8
        ? "Your consistency is adding up. Keep moving at a sustainable pace."
        : "Progress comes from returning to the routine, one scheduled session at a time.",
    tips: [...new Set(tips)].slice(0, 5),
  };
}

// -----------------------------------------------------
// ANALYZE ONE HABIT
// -----------------------------------------------------

function analyzeHabit(habit) {
  const habitId = String(habit._id);
  const history = getKnownHistory(habit);

  const recent = getRecentHistory(
    habit,
    history,
    RECENT_WINDOW_DAYS
  );

  const currentStreak = getStreak(habit, history);
  const todayStatus = getTodayStatus(habit, history);

  const metrics = {
    totalRecorded: history.totalRecorded,
    completedCount: history.completed.size,
    missedCount: history.missed.size,
    completionRate: history.completionRate,
    completionRatePercent:
      history.completionRate === null
        ? null
        : Math.round(history.completionRate * 100),
    currentStreak,
    recent,
  };

  const feedback = getFeedback(
    habit,
    metrics,
    recent,
    currentStreak,
    todayStatus
  );

  return {
    habitId,
    title: habit.name || "Untitled habit",
    category: habit.category || "Other",
    frequency: habit.frequency || "Daily",
    analyzedAt: new Date().toISOString(),
    todayStatus,
    metrics,
    feedback,
  };
}

// -----------------------------------------------------
// DAILY ANALYSIS FOR ACTIVE HABITS
// -----------------------------------------------------

async function getDailyHabitAnalysis(
  userId,
  requestedHabitId = null
) {
  const habits = await Habit.find({
    user: userId,
    archived: false,
  }).lean();

  const selectedHabits = requestedHabitId
    ? habits.filter(
        (habit) => String(habit._id) === String(requestedHabitId)
      )
    : habits;

  if (requestedHabitId && selectedHabits.length === 0) {
    const error = new Error(
      "Habit not found or it does not belong to this user."
    );

    error.statusCode = 404;
    throw error;
  }

  const analyses = selectedHabits.map(analyzeHabit);

  return {
    generatedAt: new Date().toISOString(),
    habitCount: analyses.length,
    summary: {
      completed: analyses.filter(
        (item) => item.todayStatus.key === "completed"
      ).length,
      missed: analyses.filter(
        (item) => item.todayStatus.key === "missed"
      ).length,
      pending: analyses.filter(
        (item) => item.todayStatus.key === "pending"
      ).length,
      notScheduled: analyses.filter(
        (item) => item.todayStatus.key === "not_scheduled"
      ).length,
    },
    habits: analyses,
  };
}

module.exports = {
  getDailyHabitAnalysis,
};
