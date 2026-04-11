const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { errorHandler } = require("./middlewares/errorHandler");
const routes = require("./routes");
const logger = require("./config/logger");
const createApp = () => {
  const app = express();
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
  app.use("/api", apiLimiter);
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  app.use("/api", routes);
  app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
  });
  app.use(errorHandler);
  return app;
};

module.exports = createApp;
