
"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Habit = require("../models/Habit");
const { FEATURES, buildTrainingData } = require("../ml/sharedData");

const {
  predictHabit,
  evaluateHabitModel,
} = require("../ml/decisionTree");

const {
  predictHabitLogistic,
  evaluateLogisticRegression,
} = require("../ml/logisticRegression");

const router = express.Router();

console.log("ML ROUTES FILE LOADED");

// =====================================================
// AUTHENTICATION
// =====================================================

function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  const secret = process.env.JWT_SECRET?.trim();

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Send a Bearer token.",
    });
  }

  if (!secret) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured.",
    });
  }

  try {
    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, secret);

    if (
      !decoded.userId ||
      !mongoose.Types.ObjectId.isValid(decoded.userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.userId = decoded.userId;
    return next();
  } catch (error) {
    console.error("ML AUTHENTICATION ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

// =====================================================
// LOAD LOGGED-IN USER'S ACTIVE HABITS
// =====================================================

async function loadUserHabits(userId) {
  return Habit.find({
    user: userId,
    archived: false,
  }).lean();
}

// =====================================================
// VALIDATE HABIT ID
// =====================================================

function validateHabitId(req, res) {
  const habitId = req.body?.habitId;

  if (
    typeof habitId !== "string" ||
    !mongoose.Types.ObjectId.isValid(habitId)
  ) {
    res.status(400).json({
      success: false,
      message: "A valid habitId is required.",
      example: {
        habitId: "YOUR_HABIT_ID",
      },
    });

    return null;
  }

  return habitId;
}

// =====================================================
// SHARED PREDICTION HANDLER
// =====================================================

async function handlePrediction(req, res, predictFunction, modelName) {
  const habitId = validateHabitId(req, res);
  if (!habitId) return;

  const habits = await loadUserHabits(req.userId);

  const selectedHabit = habits.find(
    (habit) => String(habit._id) === habitId
  );

  if (!selectedHabit) {
    return res.status(404).json({
      success: false,
      message: "Habit not found for this user.",
    });
  }

  const result = predictFunction(habits, habitId);

  return res.status(200).json({
    success: true,
    message:
      result.status === "success"
        ? `${modelName} prediction generated.`
        : `${modelName} prediction could not be generated.`,
    data: result,
  });
}

// =====================================================
// DECISION TREE PREDICTION
// POST /api/ml/predict-completion
// =====================================================

router.post("/predict-completion", protect, async (req, res) => {
  try {
    return await handlePrediction(
      req,
      res,
      predictHabit,
      "Decision Tree"
    );
  } catch (error) {
    console.error(
      "DECISION TREE PREDICTION ERROR:",
      error.stack || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not generate Decision Tree prediction.",
    });
  }
});

// =====================================================
// DECISION TREE EVALUATION
// POST /api/ml/evaluate
// =====================================================

router.post("/evaluate", protect, async (req, res) => {
  try {
    const habits = await loadUserHabits(req.userId);
    const result = evaluateHabitModel(habits);

    return res.status(200).json({
      success: true,
      message:
        result.status === "success"
          ? "Decision Tree evaluation completed."
          : "Decision Tree evaluation requires more suitable data.",
      data: result,
    });
  } catch (error) {
    console.error(
      "DECISION TREE EVALUATION ERROR:",
      error.stack || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not evaluate Decision Tree model.",
    });
  }
});

// =====================================================
// LOGISTIC REGRESSION PREDICTION
// POST /api/ml/predict-completion-logistic
// =====================================================

router.post(
  "/predict-completion-logistic",
  protect,
  async (req, res) => {
    try {
      return await handlePrediction(
        req,
        res,
        predictHabitLogistic,
        "Logistic Regression"
      );
    } catch (error) {
      console.error(
        "LOGISTIC REGRESSION PREDICTION ERROR:",
        error.stack || error.message
      );

      return res.status(500).json({
        success: false,
        message: "Could not generate Logistic Regression prediction.",
      });
    }
  }
);

// =====================================================
// LOGISTIC REGRESSION EVALUATION
// POST /api/ml/evaluate-logistic
// =====================================================

router.post("/evaluate-logistic", protect, async (req, res) => {
  try {
    const habits = await loadUserHabits(req.userId);
    const result = evaluateLogisticRegression(habits);

    return res.status(200).json({
      success: true,
      message:
        result.status === "success"
          ? "Logistic Regression evaluation completed."
          : "Logistic Regression evaluation requires more suitable data.",
      data: result,
    });
  } catch (error) {
    console.error(
      "LOGISTIC REGRESSION EVALUATION ERROR:",
      error.stack || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not evaluate Logistic Regression model.",
    });
  }
});

// =====================================================
// EXPORT TRAINING DATASET
// GET /api/ml/export-training-dataset
// =====================================================

router.get("/export-training-dataset", protect, async (req, res) => {
  try {
    const habits = await loadUserHabits(req.userId);
    const rows = buildTrainingData(habits);

    const headers = [
      "targetDate",
      "habitId",
      ...FEATURES,
      "label",
      "outcome",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";

      const valueText = String(value);
      return `"${valueText.replace(/"/g, '""')}"`;
    };

    const csvRows = rows.map((row) => {
      const featureValues = FEATURES.map((feature, index) => {
        if (
          row.featureObject &&
          Object.prototype.hasOwnProperty.call(row.featureObject, feature)
        ) {
          return row.featureObject[feature];
        }

        if (Array.isArray(row.features)) {
          return row.features[index];
        }

        if (
          row.features &&
          typeof row.features === "object" &&
          Object.prototype.hasOwnProperty.call(row.features, feature)
        ) {
          return row.features[feature];
        }

        return "";
      });

      const label = Number(row.label);

      return [
        row.targetDate ?? "",
        row.habitId ?? "",
        ...featureValues,
        row.label ?? "",
        label === 1
          ? "completed"
          : label === 0
            ? "missed"
            : "unknown",
      ];
    });

    const csv = [headers, ...csvRows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="habit_training_dataset.csv"'
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send("\uFEFF" + csv);
  } catch (error) {
    console.error(
      "TRAINING DATASET EXPORT ERROR:",
      error.stack || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not export the training dataset.",
    });
  }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
