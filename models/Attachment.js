const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Attachment = sequelize.define(
  "Attachment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    org_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    s3_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "attachments",
    timestamps: true,
    indexes: [
      { fields: ["ticket_id"] },
      { fields: ["org_id"] },
    ],
  }
);

module.exports = Attachment;
