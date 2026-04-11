const { Op, literal, fn, col } = require("sequelize");
const { Ticket, User, Comment, Attachment, AuditLog } = require("../models");
const { createError } = require("../middlewares/errorHandler");
const auditService = require("../services/auditService");
const buildFilter = (orgId, query) => {
  const where = { org_id: orgId };

  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.assignee_id) where.assignee_id = query.assignee_id;
  if (query.tags) {
    const tags = Array.isArray(query.tags) ? query.tags : query.tags.split(",");
    where.tags = { [Op.contains]: tags };
  }
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from);
    if (query.date_to) where.created_at[Op.lte] = new Date(query.date_to);
  }
  if (query.search) {
    where[Op.and] = literal(
      `search_vector @@ plainto_tsquery('english', ${Ticket.sequelize.escape(query.search)})`
    );
  }
  if (query.cursor) {
    where.created_at = {
      ...where.created_at,
      [Op.lt]: new Date(Buffer.from(query.cursor, "base64").toString("utf8")),
    };
  }
  return where;
};

const getTickets = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100); 
    const where = buildFilter(orgId, req.query);
    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: User, as: "creator", attributes: ["id", "name", "avatar_url"] },
        { model: User, as: "assignee", attributes: ["id", "name", "avatar_url"] },
      ],
      order: [["created_at", "DESC"]],
      limit: limit + 1,
    });
    const hasMore = tickets.length > limit;
    const results = hasMore ? tickets.slice(0, limit) : tickets;
    const last = results[results.length - 1];
    const nextCursor = hasMore && last?.createdAt
      ? Buffer.from(last.createdAt.toISOString()).toString("base64")
      : null;
    return res.status(200).json({
      tickets: results,
      pagination: { hasMore, nextCursor, limit },
    });
  } catch (error) {
    next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const ticket = await Ticket.findOne({
      where: { id: ticketId, org_id: orgId },
      include: [
        { model: User, as: "creator", attributes: ["id", "name", "avatar_url"] },
        { model: User, as: "assignee", attributes: ["id", "name", "avatar_url"] },
        {
          model: Comment,
          as: "comments",
          include: [{ model: User, as: "author", attributes: ["id", "name", "avatar_url"] }],
          order: [["created_at", "ASC"]],
        },
        {
          model: Attachment,
          as: "attachments",
          include: [{ model: User, as: "uploader", attributes: ["id", "name"] }],
        },
      ],
    });
    if (!ticket) return next(createError(404, "Ticket not found."));
    return res.status(200).json({ ticket });
  } catch (error) {
    next(error);
  }
};
const createTicket = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { title, description, severity = "medium", tags = [], assignee_id } = req.body;
    if (!title) return next(createError(400, "Title is required."));
    const ticket = await Ticket.create({
      org_id: orgId,
      title,
      description,
      severity,
      tags,
      assignee_id: assignee_id || null,
      created_by: req.user.id,
      status: "open",
    });
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "ticket.created",
      entity_type: "ticket",
      entity_id: ticket.id,
      new_data: ticket.toJSON(),
      req,
    });
    req.io?.to(`org:${orgId}`).emit("ticket:created", { ticket });
    return res.status(201).json({ message: "Ticket created.", ticket });
  } catch (error) {
    next(error);
  }
};
const updateTicket = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const { title, description, severity, tags, assignee_id } = req.body;
    const ticket = await Ticket.findOne({ where: { id: ticketId, org_id: orgId } });
    if (!ticket) return next(createError(404, "Ticket not found."));
    const oldData = ticket.toJSON();
    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (severity !== undefined) ticket.severity = severity;
    if (tags !== undefined) ticket.tags = tags;
    if (assignee_id !== undefined) ticket.assignee_id = assignee_id || null;
    await ticket.save();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "ticket.updated",
      entity_type: "ticket",
      entity_id: ticket.id,
      old_data: oldData,
      new_data: ticket.toJSON(),
      req,
    });
    req.io?.to(`org:${orgId}`).emit("ticket:updated", { ticket });
    return res.status(200).json({ message: "Ticket updated.", ticket });
  } catch (error) {
    next(error);
  }
};

const changeTicketStatus = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const { status } = req.body;
    if (!status) return next(createError(400, "Status is required."));
    const ticket = await Ticket.findOne({ where: { id: ticketId, org_id: orgId } });
    if (!ticket) return next(createError(404, "Ticket not found."));
    if (!Ticket.isValidTransition(ticket.status, status)) {
      return next(
        createError(
          400,
          `Cannot transition from '${ticket.status}' to '${status}'. Allowed: ${Ticket.STATUS_TRANSITIONS[ticket.status].join(", ") || "none"}`
        )
      );
    }
    const oldStatus = ticket.status;
    ticket.status = status;
    if (status === "resolved") ticket.resolved_at = new Date();
    await ticket.save();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "ticket.status_changed",
      entity_type: "ticket",
      entity_id: ticket.id,
      old_data: { status: oldStatus },
      new_data: { status },
      req,
    });
    req.io?.to(`org:${orgId}`).emit("ticket:status_changed", { ticketId, oldStatus, newStatus: status });
    return res.status(200).json({ message: "Status updated.", ticket });
  } catch (error) {
    next(error);
  }
};
const deleteTicket = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const ticket = await Ticket.findOne({ where: { id: ticketId, org_id: orgId } });
    if (!ticket) return next(createError(404, "Ticket not found."));
    const oldData = ticket.toJSON();
    await ticket.destroy();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "ticket.deleted",
      entity_type: "ticket",
      entity_id: ticketId,
      old_data: oldData,
      new_data: null,
      req,
    });
    req.io?.to(`org:${orgId}`).emit("ticket:deleted", { ticketId });
    return res.status(200).json({ message: "Ticket deleted." });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  changeTicketStatus,
  deleteTicket,
};
