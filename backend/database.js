const path = require("path");
const dotenv = require("dotenv");
const { Sequelize } = require("sequelize");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const sequelize = new Sequelize(
  process.env.DB_NAME || "apihub",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    dialect: "postgres",
    logging: false,
  }
);

// Creates the database on first start if it does not exist, so a fresh
// Postgres install works without manual setup. When the database already
// exists (the common case) this just authenticates and returns.
async function ensureDatabase() {
  try {
    await sequelize.authenticate();
    return;
  } catch (err) {
    if (err.original?.code !== "3D000") throw err; // 3D000 = database does not exist
  }

  const { Client } = require("pg");
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: "postgres",
  });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${process.env.DB_NAME || "apihub"}"`);
    console.log(`✅ Database "${process.env.DB_NAME || "apihub"}" created`);
  } finally {
    await client.end();
  }
}

module.exports = { sequelize, ensureDatabase };
