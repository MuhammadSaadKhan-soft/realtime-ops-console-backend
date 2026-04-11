const sequelize = require("../config/database");
const User = require("./User");
const Organization = require("./Organization");
const OrgMember = require("./OrgMember");
const Invite = require("./Invite");
const Ticket = require("./Ticket");
const Comment = require("./Comment");
const Attachment = require("./Attachment");
const AuditLog = require("./AuditLog");

User.belongsToMany(Organization, {
  through: OrgMember,
  foreignKey: "user_id",
  otherKey: "org_id",
  as: "organizations",
});
Organization.belongsToMany(User, {
  through: OrgMember,
  foreignKey: "org_id",
  otherKey: "user_id",
  as: "members",
});
OrgMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
OrgMember.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
User.hasMany(OrgMember, { foreignKey: "user_id" });
Organization.hasMany(OrgMember, { foreignKey: "org_id", as: "memberships" });

Organization.belongsTo(User, { foreignKey: "owner_id", as: "owner" });
User.hasMany(Organization, { foreignKey: "owner_id", as: "ownedOrgs" });

Invite.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
Invite.belongsTo(User, { foreignKey: "invited_by", as: "inviter" });
Organization.hasMany(Invite, { foreignKey: "org_id", as: "invites" });

Ticket.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
Ticket.belongsTo(User, { foreignKey: "created_by", as: "creator" });
Ticket.belongsTo(User, { foreignKey: "assignee_id", as: "assignee" });
Organization.hasMany(Ticket, { foreignKey: "org_id", as: "tickets" });
User.hasMany(Ticket, { foreignKey: "created_by", as: "createdTickets" });


Comment.belongsTo(Ticket, { foreignKey: "ticket_id", as: "ticket" });
Comment.belongsTo(User, { foreignKey: "author_id", as: "author" });
Ticket.hasMany(Comment, { foreignKey: "ticket_id", as: "comments" });

Attachment.belongsTo(Ticket, { foreignKey: "ticket_id", as: "ticket" });
Attachment.belongsTo(User, { foreignKey: "uploaded_by", as: "uploader" });
Ticket.hasMany(Attachment, { foreignKey: "ticket_id", as: "attachments" });


AuditLog.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
AuditLog.belongsTo(User, { foreignKey: "actor_id", as: "actor" });

module.exports = {
  sequelize,
  User,
  Organization,
  OrgMember,
  Invite,
  Ticket,
  Comment,
  Attachment,
  AuditLog,
};
