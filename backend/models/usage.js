const { DataTypes } = require("sequelize");
const { sequelize } = require("../database");

const Usage = sequelize.define(
  "Usage",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    ts: { type: DataTypes.BIGINT, allowNull: false },
    keyId: { type: DataTypes.STRING, allowNull: true },
    keyName: { type: DataTypes.STRING, allowNull: true },
    serviceId: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: false },
    promptTokens: { type: DataTypes.INTEGER, allowNull: false },
    completionTokens: { type: DataTypes.INTEGER, allowNull: false },
    totalTokens: { type: DataTypes.INTEGER, allowNull: false },
    latencyMs: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: false },
    stream: { type: DataTypes.BOOLEAN, allowNull: false },
  },
  {
    tableName: "usage",
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ["ts"] }, { fields: ["key_id"] }],
  }
);

module.exports = Usage;
