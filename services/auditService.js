const { AuditLog } = require("../models");
const logger = require("../config/logger");
const log = async ({
  org_id,
  actor_id,
  action,
  entity_type,
  entity_id,
  old_data,
  new_data,
  req,
}) => {
  try {
    await AuditLog.create({
      org_id,
      actor_id: actor_id || null,
      action,
      entity_type,
      entity_id,
      old_data: old_data || null,
      new_data: new_data || null,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.["user-agent"] || null,
    });
  } catch (error) {
    logger.error(`Failed to write audit log for action '${action}': ${error.message}`);
  }
};

module.exports = { log };