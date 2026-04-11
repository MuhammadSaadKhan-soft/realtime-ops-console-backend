const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  uploadAttachments,
  getSignedDownloadUrl,
  deleteAttachment,
} = require("../controllers/attachmentController");
const { protect } = require("../middlewares/auth");
const { requireOrgRole } = require("../middlewares/orgAccess");
const upload = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");
router.use(protect);

router.post(
  "/",
  requireOrgRole("member"),
  uploadLimiter,
  upload.array("files", 5),
  uploadAttachments
);
router.get("/:attachmentId/url", requireOrgRole("viewer"), getSignedDownloadUrl);
router.delete("/:attachmentId", requireOrgRole("member"), deleteAttachment);

module.exports = router;