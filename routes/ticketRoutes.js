const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  changeTicketStatus,
  deleteTicket,
} = require("../controllers/ticketController");
const { protect } = require("../middlewares/auth");
const { requireOrgRole } = require("../middlewares/orgAccess");
router.use(protect);
router.get("/", requireOrgRole("viewer"), getTickets);
router.post("/", requireOrgRole("member"), createTicket);
router.get("/:ticketId", requireOrgRole("viewer"), getTicket);
router.put("/:ticketId", requireOrgRole("member"), updateTicket);
router.patch("/:ticketId/status", requireOrgRole("member"), changeTicketStatus);
router.delete("/:ticketId", requireOrgRole("admin"), deleteTicket);

module.exports = router;
