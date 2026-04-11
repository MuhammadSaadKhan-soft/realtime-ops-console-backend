const { OrgMember, Organization } = require("../models");
const requireOrgRole = (minimumRole = "viewer") => {
  const ROLE_LEVELS = { viewer: 0, member: 1, admin: 2, owner: 3 };

  return async (req, res, next) => {
    try {
      const orgId = req.params.orgId || req.body.org_id;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required." });
      }
      const org = await Organization.findByPk(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found." });
      }
      const membership = await OrgMember.findOne({
        where: { org_id: orgId, user_id: req.user.id },
      });
      if (!membership) {
        return res.status(403).json({ message: "You are not a member of this organization." });
      }
      const userLevel = ROLE_LEVELS[membership.role] ?? -1;
      const requiredLevel = ROLE_LEVELS[minimumRole] ?? 0;
      if (userLevel < requiredLevel) {
        return res.status(403).json({
          message: `This action requires the '${minimumRole}' role or higher.`,
        });
      }
      req.org = org;
      req.orgMember = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireOrgRole };
