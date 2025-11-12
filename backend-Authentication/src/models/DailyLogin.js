const mongoose = require("mongoose");

const DailyLoginSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now },
});

DailyLoginSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyLogin", DailyLoginSchema);
