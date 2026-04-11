const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    org_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actor_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    old_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    new_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "audit_logs",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["org_id", "created_at"] },
      { fields: ["entity_type", "entity_id"] },
      { fields: ["actor_id"] },
    ],
    hooks: {

      beforeUpdate: () => {
        throw new Error("Audit logs are immutable and cannot be updated.");
      },
      beforeDestroy: () => {
        throw new Error("Audit logs are immutable and cannot be deleted.");
      },
    },
  }
);

module.exports = AuditLog;
