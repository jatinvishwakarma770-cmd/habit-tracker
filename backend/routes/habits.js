const express = require("express");
const Habit = require("../models/Habit");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "No authentication token",
      });
    }

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is empty",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    req.userId = userId;

    console.log(
      "AUTHENTICATED USER:",
      req.userId
    );

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// =====================================================
// GET ACTIVE HABITS
// GET /api/habits
// =====================================================

router.get("/", protect, async (req, res) => {
  try {
    console.log(
      "================================"
    );

    console.log("GET HABITS");

    console.log(
      "USER:",
      req.userId
    );

    const habits = await Habit.find({
      user: req.userId,
      archived: false,
    }).sort({
      createdAt: -1,
    });

    console.log(
      "HABITS FOUND:",
      habits.length
    );

    return res.status(200).json({
      success: true,
      habits,
    });
  } catch (error) {
    console.error(
      "GET HABITS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get habits",
    });
  }
});

// =====================================================
// GET ALL HABITS
// GET /api/habits/all
// =====================================================

router.get(
  "/all",
  protect,
  async (req, res) => {
    try {
      const habits = await Habit.find({
        user: req.userId,
      }).sort({
        createdAt: -1,
      });

      return res.status(200).json({
        success: true,
        habits,
      });
    } catch (error) {
      console.error(
        "GET ALL HABITS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to get all habits",
      });
    }
  }
);

// =====================================================
// CREATE HABIT
// POST /api/habits
// =====================================================

router.post(
  "/",
  protect,
  async (req, res) => {
    console.log(
      "================================"
    );

    console.log(
      "CREATE HABIT ROUTE HIT"
    );

    console.log(
      "USER:",
      req.userId
    );

    console.log(
      "BODY:",
      req.body
    );

    try {
      const {
        name,
        description,
        category,
        frequency,
        customDays,
        reminderTime,
      } = req.body;

      // -----------------------------------------------
      // NAME
      // -----------------------------------------------

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Habit name is required",
        });
      }

      // -----------------------------------------------
      // FREQUENCY
      // -----------------------------------------------

      const validFrequencies = [
        "Daily",
        "Weekdays",
        "Weekends",
        "Custom",
      ];

      const finalFrequency =
        frequency || "Daily";

      if (
        !validFrequencies.includes(
          finalFrequency
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid frequency",
        });
      }

      // -----------------------------------------------
      // CUSTOM DAYS
      // -----------------------------------------------

      const finalCustomDays =
        Array.isArray(customDays)
          ? customDays
          : [];

      if (
        finalFrequency === "Custom" &&
        finalCustomDays.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select at least one custom day",
        });
      }

      // -----------------------------------------------
      // CATEGORY
      // -----------------------------------------------

      const validCategories = [
        "Health",
        "Fitness",
        "Study",
        "Work",
        "Personal",
        "Other",
      ];

      const finalCategory =
        category || "Personal";

      if (
        !validCategories.includes(
          finalCategory
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      // -----------------------------------------------
      // CREATE
      // -----------------------------------------------

      const habit =
        new Habit({
          user: req.userId,

          name: name.trim(),

          description:
            typeof description === "string"
              ? description.trim()
              : "",

          category: finalCategory,

          frequency: finalFrequency,

          customDays:
            finalCustomDays,

          reminderTime:
            reminderTime || null,

          completedDates: [],

          archived: false,
        });

      await habit.save();

      console.log(
        "================================"
      );

      console.log(
        "HABIT CREATED SUCCESSFULLY"
      );

      console.log(
        "ID:",
        habit._id
      );

      console.log(
        "NAME:",
        habit.name
      );

      console.log(
        "USER:",
        habit.user
      );

      console.log(
        "================================"
      );

      return res.status(201).json({
        success: true,
        message:
          "Habit created successfully",
        habit,
      });
    } catch (error) {
      console.error(
        "================================"
      );

      console.error(
        "CREATE HABIT ERROR"
      );

      console.error(
        error
      );

      console.error(
        "================================"
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create habit",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET SINGLE HABIT
// GET /api/habits/:id
// =====================================================

router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid habit ID",
        });
      }

      const habit =
        await Habit.findOne({
          _id: id,
          user: req.userId,
        });

      if (!habit) {
        return res.status(404).json({
          success: false,
          message: "Habit not found",
        });
      }

      return res.status(200).json({
        success: true,
        habit,
      });
    } catch (error) {
      console.error(
        "GET SINGLE HABIT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get habit",
      });
    }
  }
);

// =====================================================
// UPDATE HABIT
// PUT /api/habits/:id
// =====================================================

router.put(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid habit ID",
        });
      }

      const {
        name,
        description,
        category,
        frequency,
        customDays,
        reminderTime,
        completedDates,
        archived,
      } = req.body;

      const updateData = {};

      if (
        typeof name === "string"
      ) {
        const trimmedName =
          name.trim();

        if (!trimmedName) {
          return res.status(400).json({
            success: false,
            message:
              "Habit name cannot be empty",
          });
        }

        updateData.name =
          trimmedName;
      }

      if (
        typeof description ===
        "string"
      ) {
        updateData.description =
          description.trim();
      }

      if (
        category !== undefined
      ) {
        updateData.category =
          category;
      }

      if (
        frequency !== undefined
      ) {
        updateData.frequency =
          frequency;
      }

      if (
        customDays !== undefined
      ) {
        if (
          !Array.isArray(
            customDays
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "customDays must be an array",
          });
        }

        updateData.customDays =
          customDays;
      }

      if (
        reminderTime !== undefined
      ) {
        updateData.reminderTime =
          reminderTime || null;
      }

      if (
        completedDates !== undefined
      ) {
        if (
          !Array.isArray(
            completedDates
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "completedDates must be an array",
          });
        }

        updateData.completedDates =
          completedDates;
      }

      if (
        archived !== undefined
      ) {
        updateData.archived =
          Boolean(archived);
      }

      if (
        Object.keys(updateData)
          .length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Nothing to update",
        });
      }

      const habit =
        await Habit.findOneAndUpdate(
          {
            _id: id,
            user: req.userId,
          },
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!habit) {
        return res.status(404).json({
          success: false,
          message:
            "Habit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Habit updated successfully",
        habit,
      });
    } catch (error) {
      console.error(
        "UPDATE HABIT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update habit",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// TOGGLE HABIT
// PUT /api/habits/:id/toggle
// =====================================================

router.put(
  "/:id/toggle",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid habit ID",
        });
      }

      const now = new Date();

      const year =
        now.getFullYear();

      const month = String(
        now.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        now.getDate()
      ).padStart(2, "0");

      const today =
        `${year}-${month}-${day}`;

      const habit =
        await Habit.findOne({
          _id: id,
          user: req.userId,
        });

      if (!habit) {
        return res.status(404).json({
          success: false,
          message:
            "Habit not found",
        });
      }

      if (
        !Array.isArray(
          habit.completedDates
        )
      ) {
        habit.completedDates = [];
      }

      const alreadyCompleted =
        habit.completedDates.includes(
          today
        );

      if (alreadyCompleted) {
        habit.completedDates =
          habit.completedDates.filter(
            date => date !== today
          );
      } else {
        habit.completedDates.push(
          today
        );
      }

      await habit.save();

      return res.status(200).json({
        success: true,
        completed:
          !alreadyCompleted,
        date: today,
        habit,
      });
    } catch (error) {
      console.error(
        "TOGGLE HABIT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to toggle habit",
      });
    }
  }
);

// =====================================================
// ARCHIVE
// PUT /api/habits/:id/archive
// =====================================================

router.put(
  "/:id/archive",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid habit ID",
        });
      }

      const habit =
        await Habit.findOneAndUpdate(
          {
            _id: id,
            user: req.userId,
          },
          {
            $set: {
              archived: true,
            },
          },
          {
            new: true,
          }
        );

      if (!habit) {
        return res.status(404).json({
          success: false,
          message:
            "Habit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Habit archived successfully",
        habit,
      });
    } catch (error) {
      console.error(
        "ARCHIVE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to archive habit",
      });
    }
  }
);

// =====================================================
// UNARCHIVE
// PUT /api/habits/:id/unarchive
// =====================================================

router.put(
  "/:id/unarchive",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid habit ID",
        });
      }

      const habit =
        await Habit.findOneAndUpdate(
          {
            _id: id,
            user: req.userId,
          },
          {
            $set: {
              archived: false,
            },
          },
          {
            new: true,
          }
        );

      if (!habit) {
        return res.status(404).json({
          success: false,
          message:
            "Habit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Habit restored successfully",
        habit,
      });
    } catch (error) {
      console.error(
        "UNARCHIVE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to restore habit",
      });
    }
  }
);

// =====================================================
// DELETE
// DELETE /api/habits/:id
// =====================================================

router.delete(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid habit ID",
        });
      }

      const habit =
        await Habit.findOneAndDelete({
          _id: id,
          user: req.userId,
        });

      if (!habit) {
        return res.status(404).json({
          success: false,
          message:
            "Habit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Habit deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE HABIT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete habit",
      });
    }
  }
);

module.exports = router;