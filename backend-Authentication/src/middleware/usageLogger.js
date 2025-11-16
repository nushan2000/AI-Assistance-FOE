// usageLogger removed: replaced with a lightweight no-op middleware.
// The project now relies on DailyLogin (created at first login of the day)
// for per-day login markers. This middleware intentionally does nothing to
// avoid background timers and per-minute billing logic which are no longer
// required.

module.exports = function usageLogger(req, res, next) {
  return next();
};
