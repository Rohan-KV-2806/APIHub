const { randomUUID, randomBytes } = require("node:crypto");
const { UnifiedKey } = require("../models");
const { encrypt, sha256 } = require("../utils/crypto");
const { keyToJSON } = require("../utils/serializers");
const { monthUsageByKeys } = require("../services/usageService");

async function list() {
  const [rows, usageMap] = await Promise.all([
    UnifiedKey.findAll({ order: [["createdAt", "ASC"]] }),
    monthUsageByKeys(),
  ]);
  return rows.map((row) => keyToJSON(row, usageMap.get(row.id)));
}

async function create(request, reply) {
  const { name, monthlyTokens, monthlyRequests } = request.body ?? {};
  if (!name) {
    return reply.code(400).send({ error: { message: "name is required" } });
  }
  const bytes = randomBytes(24);
  const keyValue = `socks-${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const row = await UnifiedKey.create({
    id: randomUUID(),
    name,
    keyEnc: encrypt(keyValue),
    keyHash: sha256(keyValue),
    monthlyTokens: monthlyTokens ?? null,
    monthlyRequests: monthlyRequests ?? null,
    createdAt: Date.now(),
  });
  return reply.code(201).send(keyToJSON(row));
}

async function update(request, reply) {
  const row = await UnifiedKey.findByPk(request.params.id);
  if (!row) {
    return reply.code(404).send({ error: { message: "Key not found" } });
  }
  const { name, monthlyTokens, monthlyRequests } = request.body ?? {};
  await row.update({
    name: name ?? row.name,
    monthlyTokens: monthlyTokens !== undefined ? monthlyTokens : row.monthlyTokens,
    monthlyRequests: monthlyRequests !== undefined ? monthlyRequests : row.monthlyRequests,
  });
  return keyToJSON(row);
}

async function remove(request, reply) {
  const deleted = await UnifiedKey.destroy({ where: { id: request.params.id } });
  if (!deleted) {
    return reply.code(404).send({ error: { message: "Key not found" } });
  }
  return { ok: true };
}

module.exports = { list, create, update, remove };
