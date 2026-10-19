
"use strict";

const express = require("express");
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `
You are a helpful AI Coach inside a habit-tracking app.

Answer questions clearly, naturally, and practically.
Help users build positive habits, improve productivity,
learn programming, and understand general topics.

Do not pretend to know the user's saved habits or personal data.
Do not invent current news, weather, prices, or other live facts.
You do not have live web search enabled in this version.
If a question requires current information, explain that limitation.
Keep answers friendly and easy to understand.
`;

router.post("/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        message: "GROQ_API_KEY is missing from backend/.env.",
      });
    }

    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a message.",
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        message: "Message is too long. Please shorten it.",
      });
    }

    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
    ];

    if (Array.isArray(history)) {
      history
        .filter(
          (item) =>
            item &&
            ["user", "ai"].includes(item.sender) &&
            typeof item.text === "string"
        )
        .slice(-10)
        .forEach((item) => {
          messages.push({
            role: item.sender === "ai" ? "assistant" : "user",
            content: item.text.slice(0, 4000),
          });
        });
    }

    // Prevent duplicate current messages in the conversation history.
    const last = messages[messages.length - 1];

    if (
      last.role === "user" &&
      last.content === message.trim()
    ) {
      // The current message is already present.
    } else {
      messages.push({
        role: "user",
        content: message.trim(),
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages,
          max_completion_tokens: 1200,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45000),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Groq API error:",
        data?.error?.message || response.status
      );

      return res.status(502).json({
        message:
          "The AI service could not answer. Please try again.",
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        message: "The AI returned an empty response.",
      });
    }

    return res.json({
      reply,
      grounded: false,
    });
  } catch (error) {
    console.error("Groq chat error:", error.message);

    return res.status(500).json({
      message:
        error.name === "TimeoutError"
          ? "The AI took too long to respond."
          : "Unable to reach the AI service. Check your internet connection.",
    });
  }
});

module.exports = router;
