// Authentication middleware using JWT
const jwt = require("jsonwebtoken");

module.exports = async function authenticateToken(req, res, next) {
  // Accept token either via Authorization: Bearer <token> or x-access-token header
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && authHeader.split(" ")[1];
  const altToken =
    req.headers["x-access-token"] || req.headers["x_access_token"];
  const token = bearerToken || altToken;
  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied." });
  }
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    // Issue a new token (rolling token)
    const newToken = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "60m" }
    );
    res.set("x-access-token", newToken);

    // usage logging removed: simplified authentication middleware

    return next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};
