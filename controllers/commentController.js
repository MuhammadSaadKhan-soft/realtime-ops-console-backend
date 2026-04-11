const { Comment, Ticket, User } = require("../models");
const { createError } = require("../middlewares/errorHandler");
const auditService = require("../services/auditService");

const createComment = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return next(createError(400, "Comment content cannot be empty."));
    }
    const ticket = await Ticket.findOne({ where: { id: ticketId, org_id: orgId } });
    if (!ticket) return next(createError(404, "Ticket not found."));
    const comment = await Comment.create({
      ticket_id: ticketId,
      org_id: orgId,
      author_id: req.user.id,
      content: content.trim(),
    });
    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: "author", attributes: ["id", "name", "avatar_url"] }],
    });
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "comment.created",
      entity_type: "comment",
      entity_id: comment.id,
      new_data: { ticket_id: ticketId, content },
      req,
    });
    req.io?.to(`org:${orgId}`).emit("comment:created", { ticketId, comment: full });
    return res.status(201).json({ message: "Comment added.", comment: full });
  } catch (error) {
    next(error);
  }
};
const updateComment = async (req, res, next) => {
  try {
    const { orgId, ticketId, commentId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return next(createError(400, "Comment content cannot be empty."));
    }
    const comment = await Comment.findOne({
      where: { id: commentId, ticket_id: ticketId, org_id: orgId },
    });
    if (!comment) return next(createError(404, "Comment not found."));
    if (comment.author_id !== req.user.id) {
      return next(createError(403, "You can only edit your own comments."));
    }
    const oldContent = comment.content;
    comment.content = content.trim();
    comment.is_edited = true;
    await comment.save();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "comment.updated",
      entity_type: "comment",
      entity_id: commentId,
      old_data: { content: oldContent },
      new_data: { content: comment.content },
      req,
    });
    req.io?.to(`org:${orgId}`).emit("comment:updated", { ticketId, comment });
    return res.status(200).json({ message: "Comment updated.", comment });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { orgId, ticketId, commentId } = req.params;
    const comment = await Comment.findOne({
      where: { id: commentId, ticket_id: ticketId, org_id: orgId },
    });
    if (!comment) return next(createError(404, "Comment not found."));
    const isAuthor = comment.author_id === req.user.id;
    const isAdmin = ["admin", "owner"].includes(req.orgMember?.role);
    if (!isAuthor && !isAdmin) {
      return next(createError(403, "You do not have permission to delete this comment."));
    }

    await comment.destroy();

    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "comment.deleted",
      entity_type: "comment",
      entity_id: commentId,
      old_data: comment.toJSON(),
      new_data: null,
      req,
    });

    req.io?.to(`org:${orgId}`).emit("comment:deleted", { ticketId, commentId });

    return res.status(200).json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
};
const getComments = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const comments = await Comment.findAll({
      where: { ticket_id: ticketId, org_id: orgId },
      include: [{ model: User, as: "author", attributes: ["id", "name", "avatar_url"] }],
      order: [["created_at", "ASC"]],
    });
    return res.status(200).json({ comments });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComment, updateComment, deleteComment, getComments };
