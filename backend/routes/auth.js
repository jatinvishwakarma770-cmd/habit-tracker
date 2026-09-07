
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

console.log("AUTH ROUTES LOADED");

// =====================================================
// JWT HELPER
// =====================================================

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post("/register", async (req, res) => {
  console.log("=================================");
  console.log("REGISTER ROUTE HIT");
  console.log("BODY:", req.body);

  try {
    const { name, email, password } = req.body;

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // -----------------------------------------------
    // CHECK EXISTING USER
    // -----------------------------------------------

    console.log("CHECKING USER:", cleanEmail);

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      console.log("USER ALREADY EXISTS");

      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // -----------------------------------------------
    // HASH PASSWORD
    // -----------------------------------------------

    console.log("HASHING PASSWORD");

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // -----------------------------------------------
    // CREATE USER
    // -----------------------------------------------

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });

    console.log(
      "USER CREATED:",
      user._id.toString()
    );

    // -----------------------------------------------
    // CREATE TOKEN
    // -----------------------------------------------

    const token = createToken(user);

    console.log("JWT CREATED");

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Registration successful",

      token,

      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error(
      "🔥 REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {
  console.log("=================================");
  console.log("LOGIN ROUTE HIT");
  console.log("BODY:", req.body);

  try {
    const { email, password } = req.body;

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail =
      email.toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // -----------------------------------------------
    // FIND USER
    // -----------------------------------------------

    console.log(
      "SEARCHING USER:",
      cleanEmail
    );

    const user = await User.findOne({
      email: cleanEmail,
    }).select("+password");

    if (!user) {
      console.log("USER NOT FOUND");

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log(
      "USER FOUND:",
      user._id.toString()
    );

    // -----------------------------------------------
    // CHECK PASSWORD
    // -----------------------------------------------

    if (!user.password) {
      console.error(
        "USER PASSWORD IS MISSING"
      );

      return res.status(500).json({
        success: false,
        message:
          "User account has no password stored",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    console.log(
      "PASSWORD MATCH:",
      passwordMatch
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // -----------------------------------------------
    // CREATE JWT
    // -----------------------------------------------

    const token =
      createToken(user);

    console.log("JWT CREATED");

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error(
      "🔥 LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;

