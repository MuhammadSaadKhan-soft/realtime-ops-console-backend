const express = require("express");
const router = express.Router();
const {
  createOrg,
  getMyOrgs,
  getOrg,
  updateOrg,
  getMembers,
  updateMemberRole,
  removeMember,
  createInvite,
  acceptInvite,
} = require("../controllers/orgController");
const { protect } = require("../middlewares/auth");
const { requireOrgRole } = require("../middlewares/orgAccess");
router.use(protect);
router.post("/", createOrg);
router.get("/", getMyOrgs);
router.get("/:orgId", requireOrgRole("viewer"), getOrg);
router.put("/:orgId", requireOrgRole("admin"), updateOrg);
router.get("/:orgId/members", requireOrgRole("viewer"), getMembers);
router.put("/:orgId/members/:userId", requireOrgRole("admin"), updateMemberRole);
router.delete("/:orgId/members/:userId", requireOrgRole("admin"), removeMember);
router.post("/:orgId/invites", requireOrgRole("admin"), createInvite);
router.post("/invites/:token/accept", acceptInvite);

module.exports = router;
