const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const UAParser = require("ua-parser-js");

const User = require("../models/User");
const OTP = require("../models/OTP");
const LoginHistory = require("../models/LoginHistory");
const authMiddleware = require("../middleware/authMiddleware");

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Login Page
router.get("/", (req, res) => {
  res.render("login");
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.create({
    email,
    otp,
    expires_at: new Date(Date.now() + 5 * 60 * 1000)
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP",
    text: `Your OTP is ${otp}`
  });

  res.render("verify", { email });
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const record = await OTP.findOne({ email, otp });

  if (!record || record.expires_at < new Date()) {
    return res.send("Invalid or expired OTP");
  }

  // Device detection
  const parser = new UAParser(req.headers["user-agent"]);
  const device = parser.getDevice().type || "desktop";

  const hour = new Date().getHours();

  // Mobile restriction
  if (device === "mobile" && (hour < 10 || hour > 13)) {
    return res.send("Mobile access allowed only 10AM–1PM");
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email });
  }

  req.session.user = user;

  // Save login history
  await LoginHistory.create({
    user_id: user._id,
    ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    browser: parser.getBrowser().name,
    os: parser.getOS().name,
    device
  });

  res.redirect("/dashboard");
});

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
  const history = await LoginHistory.find({ user_id: req.session.user._id }).sort({ login_time: -1 });

  res.render("dashboard", { history });
});

module.exports = router;