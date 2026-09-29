const { decrypt } = require("./crypto");

function serviceToJSON(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.baseUrl,
    apiKey: decrypt(row.apiKeyEnc),
    createdAt: Number(row.createdAt),
    models: row.models ?? [],
    modelsSyncedAt: row.modelsSyncedAt != null ? Number(row.modelsSyncedAt) : null,
    status: row.status,
    statusMessage: row.statusMessage ?? null,
  };
}

function keyToJSON(row, monthUsage) {
  return {
    id: row.id,
    name: row.name,
    key: decrypt(row.keyEnc),
    limits: {
      monthlyTokens: row.monthlyTokens != null ? Number(row.monthlyTokens) : null,
      monthlyRequests: row.monthlyRequests != null ? Number(row.monthlyRequests) : null,
    },
    createdAt: Number(row.createdAt),
    lastUsedAt: row.lastUsedAt != null ? Number(row.lastUsedAt) : null,
    monthUsage: monthUsage ?? { requests: 0, totalTokens: 0 },
  };
}

function usageToJSON(row) {
  return {
    id: row.id,
    ts: Number(row.ts),
    keyId: row.keyId ?? null,
    keyName: row.keyName ?? null,
    serviceId: row.serviceId ?? null,
    provider: row.provider,
    model: row.model,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    totalTokens: row.totalTokens,
    latencyMs: row.latencyMs,
    status: row.status,
    stream: row.stream,
  };
}

module.exports = { serviceToJSON, keyToJSON, usageToJSON };
