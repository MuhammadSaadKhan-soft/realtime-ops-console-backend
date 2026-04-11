const cloudinary = require("../config/cloudinary");
const { Attachment, Ticket } = require("../models");
const { createError } = require("../middlewares/errorHandler");
const auditService = require("../services/auditService");

const uploadAttachments = async (req, res, next) => {
  try {
    const { orgId, ticketId } = req.params;
    const ticket = await Ticket.findOne({ where: { id: ticketId, org_id: orgId } });
    if (!ticket) return next(createError(404, "Ticket not found."));

    if (!req.files || req.files.length === 0) {
      return next(createError(400, "No files uploaded."));
    }
    const attachments = await Promise.all(
      req.files.map((file) =>
        Attachment.create({
          ticket_id: ticketId,
          org_id: orgId,
          uploaded_by: req.user.id,
          file_name: file.originalname,
          s3_key: file.filename,
          mime_type: file.mimetype,
          file_size: file.size,
        })
      )
    );
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "attachment.uploaded",
      entity_type: "attachment",
      entity_id: attachments[0].id,
      new_data: { ticket_id: ticketId, count: attachments.length },
      req,
    });
    req.io?.to(`org:${orgId}`).emit("attachment:uploaded", { ticketId, attachments });
    return res.status(201).json({ message: "Files uploaded.", attachments });
  } catch (error) {
    next(error);
  }
};

const getSignedDownloadUrl = async (req, res, next) => {
  try {
    const { orgId, attachmentId } = req.params;
    const attachment = await Attachment.findOne({
      where: { id: attachmentId, org_id: orgId },
    });
    if (!attachment) return next(createError(404, "Attachment not found."));

    const expiresIn = 900; 
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const resType = attachment.mime_type.startsWith("image/") ? "image" : "raw";
    const url = cloudinary.utils.private_download_url(
      attachment.s3_key, 
      "", 
      {
        resource_type: resType,
        type: "private",
        expires_at: expiresAt,
        attachment: true, 
      }
    );

    return res.status(200).json({ url, expires_in: expiresIn });
  } catch (error) {
    next(error);
  }
};
const deleteAttachment = async (req, res, next) => {
  try {
    const { orgId, attachmentId } = req.params;

    const attachment = await Attachment.findOne({
      where: { id: attachmentId, org_id: orgId },
    });
    if (!attachment) return next(createError(404, "Attachment not found."));
    const isUploader = attachment.uploaded_by === req.user.id;
    const isAdmin = ["admin", "owner"].includes(req.orgMember?.role);
    if (!isUploader && !isAdmin) {
      return next(createError(403, "You do not have permission to delete this file."));
    }
    const resType = attachment.mime_type.startsWith("image/") ? "image" : "raw";
    await cloudinary.uploader.destroy(attachment.s3_key, {
      resource_type: resType,
      type: "private",
      invalidate: true,
    });
    await attachment.destroy();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "attachment.deleted",
      entity_type: "attachment",
      entity_id: attachmentId,
      old_data: { file_name: attachment.file_name },
      new_data: null,
      req,
    });
    return res.status(200).json({ message: "Attachment deleted." });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadAttachments, getSignedDownloadUrl, deleteAttachment };