require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const createApp = require("./app");
const { sequelize } = require("./models");
const { initSocket } = require("./sockets/socketHandler");
const logger = require("./config/logger");
const PORT = process.env.PORT || 5000;
const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connected successfully.");

    const app = createApp();

    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    app.use((req, _res, next) => {
      req.io = io;
      next();
    });

    initSocket(io);

    httpServer.listen(PORT, () => {
      logger.info(
        `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || "development"
        }]`
      );
    });
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      httpServer.close(async () => {
        await sequelize.close();
        logger.info("DB connection closed. Server stopped.");
        process.exit(0);
      });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection:", reason);
    });
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};
start();