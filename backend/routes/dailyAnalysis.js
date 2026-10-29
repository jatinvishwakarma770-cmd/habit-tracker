"use strict";

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const {
  getDailyHabitAnalysis,
} = require("../services/dailyHabitAnalysis");

const router = express.Router();

// Verify the user's JWT.
function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}

// GET /api/daily-analysis
// GET /api/daily-analysis/:habitId
router.get("/", protect, async (req, res, next) => {
  try {
    const result = await getDailyHabitAnalysis(req.userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:habitId", protect, async (req, res, next) => {
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
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
