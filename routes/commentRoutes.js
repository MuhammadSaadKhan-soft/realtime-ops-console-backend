const express = require("express");
const router = express.Router({ mergeParams: true }); // inherit :orgId and :ticketId
const {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");
const { protect } = require("../middlewares/auth");
const { requireOrgRole } = require("../middlewares/orgAccess");

router.use(protect);
router.get("/", requireOrgRole("viewer"), getComments);
router.post("/", requireOrgRole("member"), createComment);
router.put("/:commentId", requireOrgRole("member"), updateComment);
router.delete("/:commentId", requireOrgRole("member"), deleteComment);

module.exports = router;
