const { randomUUID } = require("node:crypto");
const { Service, UnifiedKey, Usage } = require("../models");
const { encrypt, sha256 } = require("../utils/crypto");

async function health() {
  return { ok: true };
}

// One-time import of the old localStorage data (services, keys, usage).
async function migrate(request) {
  const { services = [], keys = [], usage = [] } = request.body ?? {};

  const existingServices = new Set(
    (await Service.findAll({ attributes: ["id"] })).map((s) => s.id)
  );
  const newServices = services.filter((s) => !existingServices.has(s.id));
  if (newServices.length > 0) {
    await Service.bulkCreate(
      newServices.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        baseUrl: s.baseUrl,
        apiKeyEnc: encrypt(s.apiKey ?? ""),
        createdAt: s.createdAt ?? Date.now(),
        models: Array.isArray(s.models) ? s.models : [],
        modelsSyncedAt: s.modelsSyncedAt ?? null,
        status: s.status ?? "untested",
        statusMessage: s.statusMessage ?? null,
      }))
    );
  }

  const existingKeys = new Set(
    (await UnifiedKey.findAll({ attributes: ["id"] })).map((k) => k.id)
  );
  const newKeys = keys.filter((k) => !existingKeys.has(k.id) && k.key);
  if (newKeys.length > 0) {
    await UnifiedKey.bulkCreate(
      newKeys.map((k) => ({
        id: k.id,
        name: k.name,
        keyEnc: encrypt(k.key),
        keyHash: sha256(k.key),
        monthlyTokens: k.limits?.monthlyTokens ?? null,
        monthlyRequests: k.limits?.monthlyRequests ?? null,
        createdAt: k.createdAt ?? Date.now(),
        lastUsedAt: k.lastUsedAt ?? null,
      }))
    );
  }

  const usageIds = usage.map((u) => u.id).filter(Boolean);
  const existingUsage = usageIds.length
    ? new Set(
        (await Usage.findAll({ where: { id: usageIds }, attributes: ["id"] })).map(
          (u) => u.id
        )
      )
    : new Set();
  const newUsage = usage.filter((u) => !existingUsage.has(u.id));
  if (newUsage.length > 0) {
    await Usage.bulkCreate(
      newUsage.map((u) => ({
        id: u.id ?? randomUUID(),
        ts: u.ts ?? Date.now(),
        keyId: u.keyId ?? null,
        keyName: u.keyName ?? null,
        serviceId: u.serviceId ?? null,
        provider: u.provider ?? "unknown",
        model: u.model ?? "unknown",
        promptTokens: u.promptTokens ?? 0,
        completionTokens: u.completionTokens ?? 0,
        totalTokens: u.totalTokens ?? 0,
        latencyMs: u.latencyMs ?? 0,
        status: u.status ?? 200,
        stream: u.stream ?? true,
      }))
    );
  }

  return {
    services: newServices.length,
    keys: newKeys.length,
    usage: newUsage.length,
  };
}

module.exports = { health, migrate };
