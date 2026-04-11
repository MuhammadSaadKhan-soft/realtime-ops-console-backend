const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ROLES = ["owner", "admin", "member", "viewer"];

const OrgMember = sequelize.define(
  "OrgMember",
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
      defaultValue: "member",
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "org_members",
    timestamps: false,
    indexes: [
      
      { unique: true, fields: ["org_id", "user_id"] },
    ],
  }
);

OrgMember.ROLES = ROLES;

module.exports = OrgMember;
