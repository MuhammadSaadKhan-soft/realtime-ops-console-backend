const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again after 15 minutes." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again after 15 minutes." },
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many uploads. Please slow down." },
});
module.exports = { apiLimiter, authLimiter, uploadLimiter };
