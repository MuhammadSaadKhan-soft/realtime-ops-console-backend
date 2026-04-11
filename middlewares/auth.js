const { verifyToken } = require("../config/jwt");
const { User } = require("../models");
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided. Please log in." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token); 
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: "User not found or deactivated." });
    }
    req.user = user; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
module.exports = { protect };
