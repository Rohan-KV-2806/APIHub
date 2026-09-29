const { DataTypes } = require("sequelize");
const { sequelize } = require("../database");

const UnifiedKey = sequelize.define(
  "UnifiedKey",
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    keyEnc: { type: DataTypes.TEXT, allowNull: false },
    keyHash: { type: DataTypes.STRING, allowNull: false, unique: true },
    monthlyTokens: { type: DataTypes.BIGINT, allowNull: true },
    monthlyRequests: { type: DataTypes.BIGINT, allowNull: true },
    createdAt: { type: DataTypes.BIGINT, allowNull: false },
    lastUsedAt: { type: DataTypes.BIGINT, allowNull: true },
  },
  { tableName: "keys", underscored: true, timestamps: false }
);

module.exports = UnifiedKey;
