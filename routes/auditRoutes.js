const express = require("express");
const router = express.Router({ mergeParams: true });
const { getAuditLogs } = require("../controllers/auditController");
const { protect } = require("../middlewares/auth");
const { requireOrgRole } = require("../middlewares/orgAccess");

router.use(protect);
router.get("/", requireOrgRole("admin"), getAuditLogs);

module.exports = router;
