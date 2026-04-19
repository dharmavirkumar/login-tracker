const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  ip_address: String,
  browser: String,
  os: String,
  device: String,
  login_time: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LoginHistory", loginSchema);