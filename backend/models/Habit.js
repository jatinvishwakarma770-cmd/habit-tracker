const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    category: {
      type: String,
      enum: [
        "Health",
        "Fitness",
        "Study",
        "Work",
        "Personal",
        "Other",
      ],
      default: "Personal",
    },

    frequency: {
      type: String,
      enum: [
        "Daily",
        "Weekdays",
        "Weekends",
        "Custom",
      ],
      default: "Daily",
    },

    customDays: {
      type: [String],
      default: [],
    },

    reminderTime: {
      type: String,
      default: null,
    },

    completedDates: {
      type: [String],
      default: [],
    },

    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Habit", habitSchema);