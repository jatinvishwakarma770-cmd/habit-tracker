
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Habit = require("../models/Habit");

const router = express.Router();

// --------------------------------------------------
// Authentication
// --------------------------------------------------

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured.",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// --------------------------------------------------
// Constants
// --------------------------------------------------

const VALID_CATEGORIES = [
  "Health",
  "Fitness",
  "Study",
  "Work",
  "Personal",
  "Other",
];

const VALID_FREQUENCIES = [
  "Daily",
  "Weekdays",
  "Weekends",
  "Custom",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_DAY_NAMES = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const MAX_DATES_PER_RUN = 90;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

// --------------------------------------------------
// Date and timezone helpers
// --------------------------------------------------

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isValidDateKey(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function addDays(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + amount);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function weekdayForDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day)
  ).getUTCDay();
}

function dateKeyInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Gets today's date in the supplied timezone.
 * Defaults to Asia/Kolkata when timezone is missing.
 */
function getLocalDateForRequest(req) {
  const body =
    req.body && typeof req.body === "object"
      ? req.body
      : {};

  const suppliedTimezone = body.timezone;

  const timezone =
    typeof suppliedTimezone === "string" &&
    suppliedTimezone.trim().length > 0
      ? suppliedTimezone.trim()
      : DEFAULT_TIMEZONE;

  // Diagnostic logging: never log tokens or authorization headers.
  console.log("TIMEZONE DEBUG:", {
    method: req.method,
    path: req.originalUrl,
    bodyType: typeof req.body,
    timezone,
    contentType: req.headers["content-type"],
  });

  if (timezone.length > 100) {
    return {
      error: "Timezone is too long.",
    };
  }

  try {
    // Throws if the timezone is invalid.
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    const today = dateKeyInTimeZone(new Date(), timezone);

    if (!isValidDateKey(today)) {
      return {
        error: "Could not determine the local date.",
      };
    }

    return {
      today,
      timezone,
    };
  } catch (error) {
    console.error("TIMEZONE VALIDATION FAILED:", {
      timezone,
      error: error.message,
    });

    return {
      error:
        "Invalid timezone. Use a valid IANA timezone, for example Asia/Kolkata.",
    };
  }
}

// --------------------------------------------------
// Schedule helpers
// --------------------------------------------------

function isScheduledForDate(habit, dateKey) {
  const weekday = weekdayForDateKey(dateKey);

  switch (habit.frequency) {
    case "Daily":
      return true;

    case "Weekdays":
      return weekday >= 1 && weekday <= 5;

    case "Weekends":
      return weekday === 0 || weekday === 6;

    case "Custom": {
      const customDays = Array.isArray(habit.customDays)
        ? habit.customDays
        : [];

      return customDays.some((value) => {
        const normalized = String(value).trim().toLowerCase();

        return (
          normalized === DAY_NAMES[weekday].toLowerCase() ||
          normalized === SHORT_DAY_NAMES[weekday] ||
          normalized === String(weekday)
        );
      });
    }

    default:
      return false;
  }
}

// --------------------------------------------------
// Habit validation and payload helpers
// --------------------------------------------------

function validateHabitInput(body, { partial = false } = {}) {
  const errors = [];

  if (!partial || body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 100
    ) {
      errors.push("Name must contain 1 to 100 characters.");
    }
  }

  if (body.description !== undefined) {
    if (
      typeof body.description !== "string" ||
      body.description.length > 500
    ) {
      errors.push("Description must not exceed 500 characters.");
    }
  }

  if (
    body.category !== undefined &&
    !VALID_CATEGORIES.includes(body.category)
  ) {
    errors.push("Invalid habit category.");
  }

  if (
    body.frequency !== undefined &&
    !VALID_FREQUENCIES.includes(body.frequency)
  ) {
    errors.push("Invalid habit frequency.");
  }

  if (body.customDays !== undefined) {
    if (
      !Array.isArray(body.customDays) ||
      !body.customDays.every(
        (day) => typeof day === "string" && day.trim().length > 0
      )
    ) {
      errors.push("customDays must be an array of day names.");
    }
  }

  if (
    body.frequency === "Custom" &&
    Array.isArray(body.customDays) &&
    body.customDays.length === 0
  ) {
    errors.push("Select at least one day for a custom schedule.");
  }

  if (body.reminderTime !== undefined) {
    if (
      body.reminderTime !== null &&
      (
        typeof body.reminderTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.reminderTime)
      )
    ) {
      errors.push("reminderTime must use HH:mm format or null.");
    }
  }

  return errors;
}

function habitPayload(body, { partial = false } = {}) {
  const result = {};

  const fields = [
    "name",
    "description",
    "category",
    "frequency",
    "customDays",
    "reminderTime",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      result[field] =
        field === "name" || field === "description"
          ? body[field].trim()
          : body[field];
    }
  }

  if (!partial) {
    result.category = result.category || "Personal";
    result.frequency = result.frequency || "Daily";
    result.customDays = result.customDays || [];
    result.description = result.description || "";

    if (result.reminderTime === undefined) {
      result.reminderTime = null;
    }
  }

  return result;
}

async function findOwnedHabit(habitId, userId) {
  if (!isValidObjectId(habitId)) {
    return null;
  }

  return Habit.findOne({
    _id: habitId,
    user: userId,
  });
}

function sendServerError(res, message, error) {
  console.error(message, error.message);

  return res.status(500).json({
    success: false,
    message,
  });
}

// --------------------------------------------------
// POST /api/habits/reconcile-missed
// Record past scheduled dates that were neither
// completed nor already marked missed.
// --------------------------------------------------

router.post("/reconcile-missed", protect, async (req, res) => {
  try {
    const local = getLocalDateForRequest(req);

    if (local.error) {
      return res.status(400).json({
        success: false,
        message: local.error,
      });
    }

    const { today, timezone } = local;
    const yesterday = addDays(today, -1);

    const habits = await Habit.find({
      user: req.userId,
      archived: false,
    });

    let processedDates = 0;
    let newlyMissed = 0;
    let updatedHabits = 0;

    for (const habit of habits) {
      const createdDate = dateKeyInTimeZone(
        habit.createdAt || new Date(),
        timezone
      );

      let nextDate = habit.missedTrackingThroughDate
        ? addDays(habit.missedTrackingThroughDate, 1)
        : createdDate;

      if (nextDate < createdDate) {
        nextDate = createdDate;
      }

      if (nextDate > yesterday) {
        continue;
      }

      const completed = new Set(habit.completedDates || []);
      const missed = new Set(habit.missedDates || []);

      let daysThisRun = 0;
      let lastProcessedDate = null;

      while (
        nextDate <= yesterday &&
        daysThisRun < MAX_DATES_PER_RUN
      ) {
        if (
          isScheduledForDate(habit, nextDate) &&
          !completed.has(nextDate) &&
          !missed.has(nextDate)
        ) {
          missed.add(nextDate);
          newlyMissed++;
        }

        lastProcessedDate = nextDate;
        nextDate = addDays(nextDate, 1);
        daysThisRun++;
        processedDates++;
      }

      if (lastProcessedDate) {
        habit.missedDates = Array.from(missed).sort();
        habit.missedTrackingThroughDate = lastProcessedDate;

        await habit.save();
        updatedHabits++;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Missed-habit reconciliation completed.",
      data: {
        today,
        timezone,
        processedDates,
        newlyMissed,
        updatedHabits,
      },
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to reconcile missed habits.",
      error
    );
  }
});

// --------------------------------------------------
// GET /api/habits/all
// Return active and archived habits.
// Keep this before /:id.
// --------------------------------------------------

router.get("/all", protect, async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: habits.length,
      data: habits,
    });
  } catch (error) {
    return sendServerError(res, "Failed to fetch habits.", error);
  }
});

// --------------------------------------------------
// GET /api/habits
// Return active habits.
// --------------------------------------------------

router.get("/", protect, async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.userId,
      archived: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: habits.length,
      data: habits,
    });
  } catch (error) {
    return sendServerError(res, "Failed to fetch habits.", error);
  }
});

// --------------------------------------------------
// POST /api/habits
// Create a habit.
// --------------------------------------------------

router.post("/", protect, async (req, res) => {
  try {
    const body = req.body || {};
    const errors = validateHabitInput(body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const payload = habitPayload(body);

    if (
      payload.frequency === "Custom" &&
      payload.customDays.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one custom day.",
      });
    }

    const habit = await Habit.create({
      ...payload,
      user: req.userId,
      completedDates: [],
      missedDates: [],
      archived: false,
      missedTrackingThroughDate: null,
    });

    return res.status(201).json({
      success: true,
      message: "Habit created successfully.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to create habit.", error);
  }
});

// --------------------------------------------------
// PATCH /api/habits/:id/toggle
// Toggle completion for today's local date.
// --------------------------------------------------

router.patch("/:id/toggle", protect, async (req, res) => {
  try {
    const local = getLocalDateForRequest(req);

    if (local.error) {
      return res.status(400).json({
        success: false,
        message: local.error,
      });
    }

    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    if (habit.archived) {
      return res.status(400).json({
        success: false,
        message: "Unarchive this habit before changing its completion.",
      });
    }

    const completed = new Set(habit.completedDates || []);
    const missed = new Set(habit.missedDates || []);
    const date = local.today;

    if (completed.has(date)) {
      completed.delete(date);
    } else {
      completed.add(date);
      missed.delete(date);
    }

    habit.completedDates = Array.from(completed).sort();
    habit.missedDates = Array.from(missed).sort();

    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Habit completion updated.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to update habit completion.",
      error
    );
  }
});

// --------------------------------------------------
// POST /api/habits/:id/mark-missed
// --------------------------------------------------

router.post("/:id/mark-missed", protect, async (req, res) => {
  try {
    const local = getLocalDateForRequest(req);

    if (local.error) {
      return res.status(400).json({
        success: false,
        message: local.error,
      });
    }

    const { date } = req.body || {};

    if (!isValidDateKey(date) || date > local.today) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date that is not in the future.",
      });
    }

    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    if (habit.archived) {
      return res.status(400).json({
        success: false,
        message: "Unarchive this habit before updating it.",
      });
    }

    if (!isScheduledForDate(habit, date)) {
      return res.status(400).json({
        success: false,
        message: "This habit was not scheduled for that date.",
      });
    }

    const completed = new Set(habit.completedDates || []);

    if (completed.has(date)) {
      return res.status(400).json({
        success: false,
        message: "A completed habit cannot be marked missed.",
      });
    }

    const missed = new Set(habit.missedDates || []);
    missed.add(date);

    habit.missedDates = Array.from(missed).sort();

    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Habit marked as missed.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(
      res,
      "Failed to mark habit missed.",
      error
    );
  }
});

// --------------------------------------------------
// Archive habit
// PATCH or POST /api/habits/:id/archive
// --------------------------------------------------

async function archiveHabit(req, res) {
  try {
    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    habit.archived = true;
    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Habit archived successfully.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to archive habit.", error);
  }
}

router.patch("/:id/archive", protect, archiveHabit);
router.post("/:id/archive", protect, archiveHabit);

// --------------------------------------------------
// Unarchive habit
// PATCH or POST /api/habits/:id/unarchive
// --------------------------------------------------

async function unarchiveHabit(req, res) {
  try {
    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    habit.archived = false;
    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Habit restored successfully.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to restore habit.", error);
  }
}

router.patch("/:id/unarchive", protect, unarchiveHabit);
router.post("/:id/unarchive", protect, unarchiveHabit);

// --------------------------------------------------
// PATCH /api/habits/:id/reminder
// Update reminder time.
// --------------------------------------------------

router.patch("/:id/reminder", protect, async (req, res) => {
  try {
    const body = req.body || {};

    const errors = validateHabitInput(
      {
        reminderTime: body.reminderTime,
      },
      { partial: true }
    );

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
      });
    }

    if (body.reminderTime === undefined) {
      return res.status(400).json({
        success: false,
        message: "reminderTime is required.",
      });
    }

    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    habit.reminderTime = body.reminderTime;
    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Reminder updated successfully.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to update reminder.", error);
  }
});

// --------------------------------------------------
// Update habit details
// PATCH or PUT /api/habits/:id
// --------------------------------------------------

async function updateHabit(req, res) {
  try {
    const body = req.body || {};
    const errors = validateHabitInput(body, { partial: true });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    const updates = habitPayload(body, { partial: true });
    const nextFrequency = updates.frequency || habit.frequency;

    const nextCustomDays =
      updates.customDays !== undefined
        ? updates.customDays
        : habit.customDays;

    if (
      nextFrequency === "Custom" &&
      (!Array.isArray(nextCustomDays) || nextCustomDays.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one day for a custom schedule.",
      });
    }

    Object.assign(habit, updates);
    await habit.save();

    return res.status(200).json({
      success: true,
      message: "Habit updated successfully.",
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to update habit.", error);
  }
}

router.patch("/:id", protect, updateHabit);
router.put("/:id", protect, updateHabit);

// --------------------------------------------------
// DELETE /api/habits/:id
// --------------------------------------------------

router.delete("/:id", protect, async (req, res) => {
  try {
    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    await Habit.deleteOne({
      _id: habit._id,
      user: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Habit deleted successfully.",
      data: {
        id: habit._id,
      },
    });
  } catch (error) {
    return sendServerError(res, "Failed to delete habit.", error);
  }
});

// --------------------------------------------------
// GET /api/habits/:id
// Keep after named routes.
// --------------------------------------------------

router.get("/:id", protect, async (req, res) => {
  try {
    const habit = await findOwnedHabit(req.params.id, req.userId);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: "Habit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: habit,
    });
  } catch (error) {
    return sendServerError(res, "Failed to fetch habit.", error);
  }
});

module.exports = router;
