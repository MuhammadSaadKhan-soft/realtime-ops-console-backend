const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { Organization, OrgMember, User, Invite, AuditLog } = require("../models");
const { createError } = require("../middlewares/errorHandler");
const emailService = require("../services/emailService");
const auditService = require("../services/auditService");

const createOrg = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return next(createError(400, "Organization name is required."));
    const baseSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const slug = `${baseSlug}-${uuidv4().slice(0, 6)}`;

    const org = await Organization.create({
      name,
      slug,
      description,
      owner_id: req.user.id,
    });
    await OrgMember.create({ org_id: org.id, user_id: req.user.id, role: "owner" });
    await auditService.log({
      org_id: org.id,
      actor_id: req.user.id,
      action: "org.created",
      entity_type: "organization",
      entity_id: org.id,
      new_data: org.toJSON(),
      req,
    });

    return res.status(201).json({ message: "Organization created.", org });
  } catch (error) {
    next(error);
  }
};
const getMyOrgs = async (req, res, next) => {
  try {
    const memberships = await OrgMember.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Organization, as: "organization" }],
    });
    const orgs = memberships.map((m) => ({
      ...m.organization.toJSON(),
      role: m.role,
    }));
    return res.status(200).json({ orgs });
  } catch (error) {
    next(error);
  }
};
const getOrg = async (req, res, next) => {
  try {
    const org = await Organization.findByPk(req.params.orgId, {
      include: [{ model: User, as: "owner", attributes: ["id", "name", "email"] }],
    });
    return res.status(200).json({ org });
  } catch (error) {
    next(error);
  }
};
const updateOrg = async (req, res, next) => {
  try {
    const { name, description, logo_url } = req.body;
    const org = req.org;

    const oldData = org.toJSON();
    if (name) org.name = name;
    if (description !== undefined) org.description = description;
    if (logo_url !== undefined) org.logo_url = logo_url;

    await org.save();

    await auditService.log({
      org_id: org.id,
      actor_id: req.user.id,
      action: "org.updated",
      entity_type: "organization",
      entity_id: org.id,
      old_data: oldData,
      new_data: org.toJSON(),
      req,
    });

    return res.status(200).json({ message: "Organization updated.", org });
  } catch (error) {
    next(error);
  }
};

const getMembers = async (req, res, next) => {
  try {
    const members = await OrgMember.findAll({
      where: { org_id: req.params.orgId },
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "avatar_url"] }],
    });

    return res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
};
const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { orgId, userId } = req.params;

    if (!OrgMember.ROLES.includes(role)) {
      return next(createError(400, `Invalid role. Must be one of: ${OrgMember.ROLES.join(", ")}`));
    }
    if (role === "owner") {
      return next(createError(400, "Cannot assign 'owner' role via this endpoint."));
    }
    const membership = await OrgMember.findOne({ where: { org_id: orgId, user_id: userId } });
    if (!membership) return next(createError(404, "Member not found."));
    if (membership.role === "owner") return next(createError(403, "Cannot change the owner's role."));
    const oldRole = membership.role;
    membership.role = role;
    await membership.save();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "member.role_changed",
      entity_type: "org_member",
      entity_id: membership.id,
      old_data: { role: oldRole },
      new_data: { role },
      req,
    });
    return res.status(200).json({ message: "Member role updated.", membership });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { orgId, userId } = req.params;

    const membership = await OrgMember.findOne({ where: { org_id: orgId, user_id: userId } });
    if (!membership) return next(createError(404, "Member not found."));
    if (membership.role === "owner") return next(createError(403, "Cannot remove the org owner."));
    await membership.destroy();
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "member.removed",
      entity_type: "org_member",
      entity_id: membership.id,
      old_data: membership.toJSON(),
      new_data: null,
      req,
    });
    return res.status(200).json({ message: "Member removed." });
  } catch (error) {
    next(error);
  }
};
const createInvite = async (req, res, next) => {
  try {
    const { email, role = "member" } = req.body;
    const orgId = req.params.orgId;
    const token = uuidv4().replace(/-/g, "");
    const invite = await Invite.create({
      org_id: orgId,
      invited_by: req.user.id,
      email: email || null,
      token,
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    if (email) {
      await emailService.sendInviteEmail({
        to: email,
        inviterName: req.user.name,
        orgName: req.org.name,
        token,
      });
    }
    await auditService.log({
      org_id: orgId,
      actor_id: req.user.id,
      action: "member.invited",
      entity_type: "invite",
      entity_id: invite.id,
      new_data: { email, role, token },
      req,
    });
    return res.status(201).json({
      message: "Invite created.",
      invite,
      invite_url: `${process.env.CLIENT_URL}/invite/${token}`,
    });
  } catch (error) {
    next(error);
  }
};
const acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invite = await Invite.findOne({ where: { token } });
    if (!invite) return next(createError(404, "Invite not found."));
    if (invite.accepted_at) return next(createError(400, "Invite already used."));
    if (invite.expires_at < new Date()) return next(createError(400, "Invite has expired."));
    if (invite.email && invite.email !== req.user.email) {
      return next(createError(403, "This invite is for a different email address."));
    }
    const existing = await OrgMember.findOne({
      where: { org_id: invite.org_id, user_id: req.user.id },
    });
    if (existing) return next(createError(409, "You are already a member of this organization."));
    await OrgMember.create({
      org_id: invite.org_id,
      user_id: req.user.id,
      role: invite.role,
    });
    invite.accepted_at = new Date();
    await invite.save();
    await auditService.log({
      org_id: invite.org_id,
      actor_id: req.user.id,
      action: "member.joined",
      entity_type: "org_member",
      entity_id: invite.id,
      new_data: { user_id: req.user.id, role: invite.role },
      req,
    });
    return res.status(200).json({ message: "Invite accepted. Welcome to the organization!" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrg,
  getMyOrgs,
  getOrg,
  updateOrg,
  getMembers,
  updateMemberRole,
  removeMember,
  createInvite,
  acceptInvite,
};
