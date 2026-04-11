const { Op } = require("sequelize");
const { AuditLog, User } = require("../models");

const getAuditLogs = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const where = { org_id: orgId };
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;
    if (req.query.actor_id) where.actor_id = req.query.actor_id;
    if (req.query.action) where.action = { [Op.like]: `${req.query.action}%` };
    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) where.created_at[Op.gte] = new Date(req.query.date_from);
      if (req.query.date_to) where.created_at[Op.lte] = new Date(req.query.date_to);
    }
    if (req.query.cursor) {
      const cursorDate = new Date(Buffer.from(req.query.cursor, "base64").toString("utf8"));
      where.created_at = { ...(where.created_at || {}), [Op.lt]: cursorDate };
    }
    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: "actor", attributes: ["id", "name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: limit + 1,
    });
    const hasMore = logs.length > limit;
    const results = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore
      ? Buffer.from(results[results.length - 1].created_at.toISOString()).toString("base64")
      : null;

    return res.status(200).json({
      logs: results,
      pagination: { hasMore, nextCursor, limit },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
