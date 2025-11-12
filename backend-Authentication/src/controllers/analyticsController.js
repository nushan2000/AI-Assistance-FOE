const UsageInterval = require("../models/UsageInterval");
const DailyLogin = require("../models/DailyLogin");

exports.getMonthlyUsage = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1-based
    if (!year || !month)
      return res.status(400).json({ message: "year and month required" });

    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Query DailyLogin documents for this user in the month. This is our
    // canonical source for "did the user log in on this date?" — each
    // DailyLogin is created at the first login of the day (upserted).
    // However, for compatibility we also fall back to UsageInterval starts
    // if DailyLogin docs are not yet present.
    const monthStartLocal = new Date(year, month - 1, 1, 0, 0, 0);
    const monthEndLocal = new Date(year, month, 0, 23, 59, 59);

    const dateStartKey = monthStartLocal.toISOString().slice(0, 10);
    const dateEndKey = monthEndLocal.toISOString().slice(0, 10);

    const result = {};

    // First try DailyLogin
    const logins = await DailyLogin.find({
      userId: String(user.userId),
      date: { $gte: dateStartKey, $lte: dateEndKey },
    }).lean();
    for (const l of logins) result[l.date] = true;

    // If we found nothing via DailyLogin, or to be safe, merge in any
    // UsageInterval starts that fall in the month (this keeps backward
    // compatibility with previously saved intervals).
    const intervals = await UsageInterval.find({
      userId: String(user.userId),
      start: { $gte: monthStartLocal, $lte: monthEndLocal },
    }).lean();
    for (const it of intervals) {
      const d = new Date(it.start).toISOString().slice(0, 10);
      result[d] = true;
    }

    return res.json(result);
  } catch (err) {
    console.error("getMonthlyUsage error", err);
    res.status(500).json({ message: "Server error" });
  }
};
