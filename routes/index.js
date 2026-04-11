const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const orgRoutes = require("./orgRoutes");
const ticketRoutes = require("./ticketRoutes");
const commentRoutes = require("./commentRoutes");
const attachmentRoutes = require("./attachmentRoutes");
const auditRoutes = require("./auditRoutes");
router.use("/auth", authRoutes);
router.use("/orgs", orgRoutes);
router.use("/orgs/:orgId/tickets", ticketRoutes);
router.use("/orgs/:orgId/tickets/:ticketId/comments", commentRoutes);
router.use(
    "/orgs/:orgId/tickets/:ticketId/attachments",
    attachmentRoutes
);
router.use("/orgs/:orgId/audit-logs", auditRoutes);

module.exports = router;
