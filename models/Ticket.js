const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const STATUSES = ["open", "investigating", "mitigated", "resolved"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUS_TRANSITIONS = {
  open: ["investigating"],
  investigating: ["mitigated", "resolved"],
  mitigated: ["investigating", "resolved"],
  resolved: [],
};

const Ticket = sequelize.define(
  "Ticket",
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: "open",
    },
    severity: {
      type: DataTypes.ENUM(...SEVERITIES),
      allowNull: false,
      defaultValue: "medium",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    assignee_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    search_vector: {
      type: DataTypes.TSVECTOR,
      allowNull: true,
    },
  },
  {
    tableName: "tickets",
    timestamps: true,
    indexes: [
      { fields: ["org_id"] },
      { fields: ["org_id", "status"] },
      { fields: ["org_id", "severity"] },
      { fields: ["assignee_id"] },
      { fields: ["created_at"] },

    ],
  }
);

Ticket.STATUSES = STATUSES;
Ticket.SEVERITIES = SEVERITIES;
Ticket.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
Ticket.isValidTransition = (from, to) => {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};

module.exports = Ticket;
