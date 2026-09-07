
// =====================================================
// LOAD ENVIRONMENT VARIABLES FIRST
// =====================================================

require("dotenv").config();

// =====================================================
// DNS FIX FOR MONGODB SRV
// =====================================================

const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

// =====================================================
// IMPORTS
// =====================================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const OpenAI = require("openai");

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");

// =====================================================
// APP
// =====================================================

const app = express();

const PORT = process.env.PORT || 5000;

// =====================================================
// BASIC ENV CHECK
// =====================================================

console.log("=================================");
console.log("ENV CHECK");
console.log("PORT:", process.env.PORT);
console.log(
  "MONGODB_URI:",
  process.env.MONGODB_URI
    ? "FOUND"
    : "MISSING"
);
console.log(
  "JWT_SECRET:",
  process.env.JWT_SECRET
    ? "FOUND"
    : "MISSING"
);
console.log(
  "OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY
    ? "FOUND"
    : "MISSING"
);
console.log("=================================");

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));

// =====================================================
// REQUEST LOGGER
// =====================================================

app.use((req, res, next) => {
  console.log(
    `REQUEST: ${req.method} ${req.originalUrl}`
  );

  next();
});

// =====================================================
// ROUTES
// =====================================================

// Authentication
app.use(
  "/api/auth",
  authRoutes
);

// Habits
app.use(
  "/api/habits",
  habitRoutes
);

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "Habit Tracker Backend is running 🚀",
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      success: true,

      message:
        "Server is healthy",

      mongodb:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",

      databaseState:
        mongoose.connection.readyState,
    });
  }
);

// =====================================================
// TEST POST
// =====================================================

app.post(
  "/test-post",
  (req, res) => {

    console.log(
      "POST TEST RECEIVED"
    );

    console.log(
      "BODY:",
      req.body
    );

    res.json({
      success: true,
      message:
        "POST is working",
      body: req.body,
    });
  }
);

// =====================================================
// OPENAI
// =====================================================

let openai = null;

if (
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !==
    "your_openai_key_here"
) {

  openai = new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

  console.log(
    "OpenAI client initialized ✅"
  );

} else {

  console.log(
    "OpenAI API key not configured ⚠️"
  );
}

// =====================================================
// MONGODB CONNECTION
// =====================================================

const connectDB = async () => {

  try {

    if (!process.env.MONGODB_URI) {

      throw new Error(
        "MONGODB_URI is missing from .env"
      );
    }

    if (!process.env.JWT_SECRET) {

      throw new Error(
        "JWT_SECRET is missing from .env"
      );
    }

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log(
      "MongoDB Connected Successfully ✅"
    );

    console.log(
      "Database:",
      mongoose.connection.name
    );

  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "MongoDB Connection Error ❌"
    );

    console.error(
      error.message
    );

    console.error(
      "================================="
    );

    throw error;
  }
};

// =====================================================
// AI CHAT
// =====================================================

app.post(
  "/api/ai/chat",
  async (req, res) => {

    try {

      if (!openai) {

        return res.status(503).json({
          success: false,
          message:
            "OpenAI API key is not configured",
        });
      }

      const {
        message,
        habits = [],
      } = req.body;

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (
        !message ||
        typeof message !== "string" ||
        !message.trim()
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Message is required",
        });
      }

      // -----------------------------------------------
      // TODAY
      // -----------------------------------------------

      const now =
        new Date();

      const year =
        now.getFullYear();

      const month =
        String(
          now.getMonth() + 1
        ).padStart(2, "0");

      const day =
        String(
          now.getDate()
        ).padStart(2, "0");

      const today =
        `${year}-${month}-${day}`;

      // -----------------------------------------------
      // HABIT INFORMATION
      // -----------------------------------------------

      let totalCompletedDays = 0;

      const habitInformation =
        Array.isArray(habits)
          ? habits
              .map((habit) => {

                const completedDates =
                  Array.isArray(
                    habit.completedDates
                  )
                    ? habit.completedDates
                    : [];

                const completedToday =
                  completedDates.includes(
                    today
                  );

                totalCompletedDays +=
                  completedDates.length;

                return `
Habit: ${habit.name || "Unknown"}

Completed today: ${
                  completedToday
                    ? "Yes"
                    : "No"
                }

Total completed days: ${
                  completedDates.length
                }

Completed dates:
${
  completedDates.join(", ") ||
  "None"
}
`;
              })
              .join("\n")
          : "No habits available.";

      // -----------------------------------------------
      // STATISTICS
      // -----------------------------------------------

      const totalHabits =
        Array.isArray(habits)
          ? habits.length
          : 0;

      const completedTodayCount =
        Array.isArray(habits)
          ? habits.filter(
              (habit) => {

                const dates =
                  Array.isArray(
                    habit.completedDates
                  )
                    ? habit.completedDates
                    : [];

                return dates.includes(
                  today
                );
              }
            ).length
          : 0;

      const completionRate =
        totalHabits === 0
          ? 0
          : Math.round(
              (
                completedTodayCount /
                totalHabits
              ) *
              100
            );

      // -----------------------------------------------
      // PROMPT
      // -----------------------------------------------

      const prompt = `
You are an AI Habit Coach inside a habit tracking application.

Be supportive, practical, concise and personalized.

TODAY:
${today}

USER STATISTICS:

Total habits:
${totalHabits}

Completed today:
${completedTodayCount}/${totalHabits}

Today's completion rate:
${completionRate}%

Total completed habit days:
${totalCompletedDays}

HABIT INFORMATION:

${habitInformation}

USER QUESTION:

${message.trim()}

RULES:

1. Use the user's actual habit data when relevant.
2. Do not invent statistics.
3. Give practical advice.
4. Encourage consistency rather than perfection.
5. Keep responses reasonably concise.
6. If there are no habits, suggest starting with one small habit.
7. Do not claim to be a doctor or therapist.
8. Use emojis occasionally.
`;

      // -----------------------------------------------
      // OPENAI REQUEST
      // -----------------------------------------------

      const response =
        await openai.responses.create({

          model:
            "gpt-5.6-luna",

          input:
            prompt,
        });

      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      return res.json({

        success: true,

        reply:
          response.output_text ||
          "I could not generate a response.",
      });

    } catch (error) {

      console.error(
        "================================="
      );

      console.error(
        "AI ERROR:"
      );

      console.error(
        error
      );

      console.error(
        "================================="
      );

      return res.status(500).json({

        success: false,

        message:
          "AI request failed",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use(
  (req, res) => {

    console.log(
      "404 ROUTE:",
      req.originalUrl
    );

    res.status(404).json({

      success: false,

      message:
        "Route not found",

      path:
        req.originalUrl,
    });
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {

    console.error(
      "GLOBAL ERROR:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Internal server error",

      error:
        error.message,
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

const startServer =
  async () => {

    try {

      await connectDB();

      app.listen(
        PORT,
        "0.0.0.0",
        () => {

          console.log(
            "================================="
          );

          console.log(
            "Habit Tracker Backend Started 🚀"
          );

          console.log(
            `Server: http://localhost:${PORT}`
          );

          console.log(
            `Mobile/API: http://192.168.1.72:${PORT}`
          );

          console.log(
            `Auth API: http://localhost:${PORT}/api/auth`
          );

          console.log(
            `Habit API: http://localhost:${PORT}/api/habits`
          );

          console.log(
            `Health: http://localhost:${PORT}/api/health`
          );

          console.log(
            "================================="
          );
        }
      );

    } catch (error) {

      console.error(
        "SERVER START FAILED ❌"
      );

      process.exit(1);
    }
  };

startServer();

