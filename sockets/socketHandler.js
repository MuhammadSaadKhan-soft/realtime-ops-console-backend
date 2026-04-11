const { verifyToken } = require("../config/jwt");
const { OrgMember, User } = require("../models");
const logger = require("../config/logger");
const presenceMap = new Map();

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token required."));

      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.id, {
        attributes: ["id", "name", "email", "avatar_url"],
      });

      if (!user || !user.is_active) return next(new Error("User not found."));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token."));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.user.name} (${socket.id})`);
    socket.on("join_org", async ({ orgId }) => {
      try {
        const membership = await OrgMember.findOne({
          where: { org_id: orgId, user_id: socket.user.id },
        });
        if (!membership) {
          socket.emit("error", { message: "Not a member of this organization." });
          return;
        }
        socket.rooms.forEach((room) => {
          if (room.startsWith("org:") && room !== `org:${orgId}`) {
            socket.leave(room);
            const prevOrgId = room.replace("org:", "");
            removePresence(prevOrgId, socket.user.id, io);
          }
        });
        socket.join(`org:${orgId}`);
        socket.currentOrgId = orgId;
        addPresence(orgId, socket.user, socket.id, io);
        logger.info(`${socket.user.name} joined org room: ${orgId}`);
      } catch (err) {
        logger.error(`join_org error: ${err.message}`);
      }
    });
    socket.on("typing_start", ({ ticketId }) => {
      if (socket.currentOrgId) {
        socket.to(`org:${socket.currentOrgId}`).emit("user_typing", {
          ticketId,
          user: { id: socket.user.id, name: socket.user.name },
        });
      }
    });
    socket.on("typing_stop", ({ ticketId }) => {
      if (socket.currentOrgId) {
        socket.to(`org:${socket.currentOrgId}`).emit("user_stopped_typing", {
          ticketId,
          userId: socket.user.id,
        });
      }
    });
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.user.name} (${socket.id})`);
      if (socket.currentOrgId) {
        removePresence(socket.currentOrgId, socket.user.id, io);
      }
    });
  });
};
const addPresence = (orgId, user, socketId, io) => {
  if (!presenceMap.has(orgId)) presenceMap.set(orgId, new Map());
  presenceMap.get(orgId).set(user.id, { id: user.id, name: user.name, avatar_url: user.avatar_url, socketId });
  io.to(`org:${orgId}`).emit("presence_update", {
    users: Array.from(presenceMap.get(orgId).values()),
  });
};

const removePresence = (orgId, userId, io) => {
  if (presenceMap.has(orgId)) {
    presenceMap.get(orgId).delete(userId);
    io.to(`org:${orgId}`).emit("presence_update", {
      users: Array.from(presenceMap.get(orgId).values()),
    });
  }
};

module.exports = { initSocket };
