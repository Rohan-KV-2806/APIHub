const { DataTypes } = require("sequelize");
const { sequelize } = require("../database");

const Service = sequelize.define(
  "Service",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    baseUrl: { type: DataTypes.STRING, allowNull: false },
    apiKeyEnc: { type: DataTypes.TEXT, allowNull: false },
    createdAt: { type: DataTypes.BIGINT, allowNull: false },
    models: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    modelsSyncedAt: { type: DataTypes.BIGINT, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "untested" },
    statusMessage: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "services", underscored: true, timestamps: false }
);

module.exports = Service;
