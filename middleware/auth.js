const jwt = require("jsonwebtoken");
const JWT_SECRET = "your_secret_key";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "ไม่มี token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "token ไม่ถูกต้อง" });
  }
}

module.exports = auth;
