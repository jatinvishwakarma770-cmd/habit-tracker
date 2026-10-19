
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

console.log("AUTH ROUTES LOADED");

// =====================================================
// JWT SECRET
// =====================================================

const getJWTSecret = () => {
  const secret =
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "JWT_SECRET is missing in .env"
    );
  }

  return secret;
};

// =====================================================
// CREATE TOKEN
// =====================================================

const createToken = (user) => {
  const secret =
    getJWTSecret();

  const userId =
    user._id.toString();

  const token =
    jwt.sign(
      {
        userId,
      },
      secret,
      {
        expiresIn: "7d",
      }
    );

  console.log(
    "JWT CREATED FOR USER:",
    userId
  );

  return token;
};

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const protect = (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "No authentication token",
      });
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is empty",
      });
    }

    const decoded =
      jwt.verify(
        token,
        getJWTSecret()
      );

    if (
      !decoded ||
      !decoded.userId
    ) {
      return res.status(401).json({
        success: false,
        message:
          "User ID not found in token",
      });
    }

    req.userId =
      decoded.userId;

    console.log(
      "AUTH VERIFIED:",
      req.userId
    );

    next();
  } catch (error) {
    console.error(
      "JWT VERIFY ERROR:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

router.post(
  "/register",
  async (req, res) => {
    console.log(
      "================================="
    );

    console.log(
      "REGISTER ROUTE HIT"
    );

    try {
      const {
        name,
        email,
        password,
      } = req.body;

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (
        typeof name !==
          "string" ||
        typeof email !==
          "string" ||
        typeof password !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required",
        });
      }

      const cleanName =
        name.trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message:
            "Name is required",
        });
      }

      if (!cleanEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required",
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message:
            "Password is required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
      }

      // -----------------------------------------------
      // CHECK USER
      // -----------------------------------------------

      const existingUser =
        await User.findOne({
          email: cleanEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "Email is already registered",
        });
      }

      // -----------------------------------------------
      // HASH PASSWORD
      // -----------------------------------------------

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // -----------------------------------------------
      // CREATE USER
      // -----------------------------------------------

      const user =
        await User.create({
          name: cleanName,
          email: cleanEmail,
          password:
            hashedPassword,
        });

      console.log(
        "USER CREATED:",
        user._id.toString()
      );

      // -----------------------------------------------
      // TOKEN
      // -----------------------------------------------

      const token =
        createToken(user);

      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Registration successful",

        token,

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          email:
            user.email,
        },
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Registration failed",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    console.log(
      "================================="
    );

    console.log(
      "LOGIN ROUTE HIT"
    );

    try {
      const {
        email,
        password,
      } = req.body;

      if (
        typeof email !==
          "string" ||
        typeof password !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required",
        });
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required",
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message:
            "Password is required",
        });
      }

      // -----------------------------------------------
      // FIND USER
      // -----------------------------------------------

      const user =
        await User.findOne({
          email: cleanEmail,
        }).select(
          "+password"
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password",
        });
      }

      // -----------------------------------------------
      // PASSWORD
      // -----------------------------------------------

      if (!user.password) {
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

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password",
        });
      }

      // -----------------------------------------------
      // CREATE NEW TOKEN
      // -----------------------------------------------

      const token =
        createToken(user);

      console.log(
        "LOGIN TOKEN CREATED"
      );

      // -----------------------------------------------
      // RESPONSE
      // -----------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Login successful",

        token,

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          email:
            user.email,
        },
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Login failed",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET CURRENT USER
// GET /api/auth/me
// =====================================================

router.get(
  "/me",
  protect,
  async (req, res) => {
    try {
      console.log(
        "GET CURRENT USER:",
        req.userId
      );

      const user =
        await User.findById(
          req.userId
        ).select(
          "_id name email"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      return res.status(200).json({
        success: true,

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          email:
            user.email,
        },
      });
    } catch (error) {
      console.error(
        "GET ME ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get current user",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;

