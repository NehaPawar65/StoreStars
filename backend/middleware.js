require("dotenv").config();
const jwt = require("jsonwebtoken");

// Verifies the signature, so a token edited to say "role":"ADMIN" fails here.
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "You are not logged in" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// 401 means "who are you", 403 means "I know you, and no".
function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You are not allowed to do this" });
    }
    next();
  };
}

module.exports = { auth, allow };
