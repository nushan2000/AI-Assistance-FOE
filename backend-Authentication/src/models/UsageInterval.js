const mongoose = require("mongoose");

const UsageIntervalSchema = new mongoose.Schema({
  // Keep userId as string (JWT contains string id). If you prefer a
  // reference to a User collection, change this to ObjectId with ref.
  userId: { type: String, required: true, index: true },
  start: { type: Date, required: true, index: true },
  // Make `end` optional so we can persist "open" intervals when we
  // create a record at login or flush in-progress intervals. Aggregation
  // will treat a missing `end` as the current time.
  end: { type: Date, required: false, index: true },
});

module.exports = mongoose.model("UsageInterval", UsageIntervalSchema);
