
require("dotenv").config();

// =====================================================
// IMPORTS
// =====================================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const OpenAI = require("openai");

const authRoutes = require("./routes/auth");
const habitRoutes = require("./routes/habits");
const mlRoutes = require("./routes/ml");

// =====================================================
// APP INITIALIZATION
// =====================================================

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// =====================================================
// ENVIRONMENT CHECK
// =====================================================

console.log("=================================");
console.log("HABIT TRACKER BACKEND");
console.log("=================================");
console.log("PORT:", PORT);
console.log(
  "MONGODB_URI:",
  process.env.MONGODB_URI ? "FOUND" : "MISSING"
);
console.log(
  "JWT_SECRET:",
  process.env.JWT_SECRET ? "FOUND" : "MISSING"
);
console.log(
  "OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY ? "FOUND" : "MISSING"
);
console.log("=================================");

// =====================================================
// MONGODB CONNECTION DIAGNOSTICS
// =====================================================

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected successfully");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection event:", error.message);
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// =====================================================
// REQUEST LOGGER
// =====================================================

app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.originalUrl}`);
  next();
});

// =====================================================
// OPENAI INITIALIZATION
// =====================================================

let openai = null;

if (
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "your_openai_key_here"
) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log("OpenAI client initialized");
} else {
  console.log("OpenAI API key not configured");
}

// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/daily-analysis", require("./routes/dailyAnalysis"));
app.use(express.json());

app.use("/api/ai", require("./routes/ai"));

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Habit Tracker Backend is running",
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;

  const stateNames = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(state === 1 ? 200 : 503).json({
    success: state === 1,
    server: "running",
    mongodb: stateNames[state] || "unknown",
    database:
      state === 1 ? mongoose.connection.name : null,
  });
});

// =====================================================
// TEST POST
// =====================================================

app.post("/test-post", (req, res) => {
  console.log("POST TEST RECEIVED");
  console.log("BODY:", req.body);

  res.json({
    success: true,
    message: "POST is working",
    body: req.body,
  });
});

// =====================================================
// AI CHAT
// =====================================================

app.post("/api/ai/chat", async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        success: false,
        message: "OpenAI API key is not configured",
      });
    }

    const { message, habits = [] } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (!Array.isArray(habits)) {
      return res.status(400).json({
        success: false,
        message: "Habits must be an array",
      });
    }

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const today = `${year}-${month}-${day}`;

    const habitInformation = habits
      .map((habit) => {
        const completedDates = Array.isArray(habit.completedDates)
          ? habit.completedDates
          : [];

        const completedToday = completedDates.includes(today);

        return `
Habit: ${habit.name || habit.title || "Unknown"}
Category: ${habit.category || "Unspecified"}
Frequency: ${habit.frequency || "Unspecified"}
Completed today: ${completedToday ? "Yes" : "No"}
Total completed days: ${completedDates.length}
Completed dates: ${completedDates.join(", ") || "None"}
`;
      })
      .join("\n");

    const completedTodayCount = habits.filter((habit) => {
      const dates = Array.isArray(habit.completedDates)
        ? habit.completedDates
        : [];

      return dates.includes(today);
    }).length;

    const completionRate = habits.length
      ? Math.round((completedTodayCount / habits.length) * 100)
      : 0;

    const totalCompletedDays = habits.reduce((total, habit) => {
      const dates = Array.isArray(habit.completedDates)
        ? habit.completedDates
        : [];

      return total + dates.length;
    }, 0);

    const prompt = `
You are an AI Habit Coach inside a habit tracking application.

Be supportive, practical, concise and personalized.

TODAY:
${today}

USER STATISTICS:
Total habits: ${habits.length}
Completed today: ${completedTodayCount}/${habits.length}
Today's completion rate: ${completionRate}%
Total recorded completed habit days: ${totalCompletedDays}

HABIT INFORMATION:
${habitInformation || "No habits available."}

USER QUESTION:
${message.trim()}

RULES:
1. Use the provided habit data when relevant.
2. Do not invent statistics.
3. Give practical advice.
4. Encourage consistency rather than perfection.
5. Keep responses reasonably concise.
6. If there are no habits, suggest starting with one small habit.
7. Do not claim to be a doctor or therapist.
8. Use emojis occasionally.
`;

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: prompt,
    });

    return res.json({
      success: true,
      reply:
        response.output_text ||
        "I could not generate a response.",
    });
  } catch (error) {
    console.error("AI CHAT ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "AI request failed",
      error: error.message,
    });
  }
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  console.log("404 ROUTE:", req.originalUrl);

  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("GLOBAL ERROR:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// =====================================================
// MONGODB CONNECTION
// =====================================================

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
  }

  console.log("Connecting to MongoDB Atlas...");

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.name);
    console.log("Connection state:", mongoose.connection.readyState);
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    if (error.reason?.servers) {
      for (const [address, server] of error.reason.servers) {
        console.error("Server:", address);
        console.error("Server type:", server.type);
        console.error(
          "Server error:",
          server.error?.message || "No additional server error"
        );
      }
    }

    throw error;
  }
}

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("=================================");
      console.log("Habit Tracker Backend Started");
      console.log(`Local API: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(
        `ML API: http://localhost:${PORT}/api/ml/predict-completion`
      );
      console.log("=================================");
    });
  } catch (error) {
    console.error("SERVER START FAILED");
    console.error(error.message);
    process.exitCode = 1;
  }
}

startServer();
