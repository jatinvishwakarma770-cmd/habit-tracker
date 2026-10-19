
"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const {
  getDailyHabitAnalysis,
} = require("../services/dailyHabitAnalysis");

const router = express.Router();

// Authenticate the user using the same JWT format as routes/ml.js.
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is missing.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.userId = new mongoose.Types.ObjectId(userId);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

// GET /api/daily-analysis
// Return analysis for every active habit belonging to the logged-in user.
router.get("/", protect, async (req, res) => {
  try {
    const result = await getDailyHabitAnalysis(req.userId);

    return res.status(200).json({
      success: true,
      message: "Daily habit analysis generated successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Daily analysis error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode === 404
          ? error.message
          : "Unable to generate daily habit analysis.",
    });
  }
});

// GET /api/daily-analysis/:habitId
// Return analysis for one active habit owned by the logged-in user.
router.get("/:habitId", protect, async (req, res) => {
  try {
    const { habitId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid habit ID.",
      });
    }

    const result = await getDailyHabitAnalysis(
      req.userId,
      habitId
    );

    return res.status(200).json({
      success: true,
      message: "Habit analysis generated successfully.",
      data: result.habits[0],
    });
  } catch (error) {
    console.error("Individual habit analysis error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode === 404
          ? error.message
          : "Unable to generate analysis for this habit.",
    });
  }
});

module.exports = router;
