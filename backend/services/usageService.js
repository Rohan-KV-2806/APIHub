const { randomUUID } = require("node:crypto");
const { sequelize, UnifiedKey, Usage } = require("../models");
const { usageToJSON } = require("../utils/serializers");

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function logUsage(entry) {
  await Usage.create({
    id: randomUUID(),
    ts: Date.now(),
    keyId: entry.keyId ?? null,
    keyName: entry.keyName ?? null,
    serviceId: entry.serviceId ?? null,
    provider: entry.provider,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    totalTokens: entry.totalTokens,
    latencyMs: entry.latencyMs,
    status: entry.status,
    stream: entry.stream,
  });
  if (entry.keyId) {
    await UnifiedKey.update(
      { lastUsedAt: Date.now() },
      { where: { id: entry.keyId } }
    );
  }
}

async function monthUsageForKey(keyId) {
  const [row] = await sequelize.query(
    `SELECT COUNT(*)::int AS requests, COALESCE(SUM(total_tokens), 0) AS tokens
       FROM usage WHERE key_id = $1 AND ts >= $2`,
    { bind: [keyId, startOfMonth()], type: sequelize.QueryTypes.SELECT }
  );
  return {
    requests: Number(row?.requests ?? 0),
    totalTokens: Number(row?.tokens ?? 0),
  };
}

async function monthUsageByKeys() {
  const rows = await sequelize.query(
    `SELECT key_id, COUNT(*)::int AS requests, COALESCE(SUM(total_tokens), 0) AS tokens
       FROM usage WHERE key_id IS NOT NULL AND ts >= $1 GROUP BY key_id`,
    { bind: [startOfMonth()], type: sequelize.QueryTypes.SELECT }
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.key_id, {
      requests: Number(row.requests),
      totalTokens: Number(row.tokens),
    });
  }
  return map;
}

async function computeStats(days = 14) {
  const [[totals], providerRows, modelRows, recentRows] = await Promise.all([
    sequelize.query(
      `SELECT COUNT(*)::int AS requests,
              COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
              COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
              COALESCE(AVG(latency_ms), 0) AS avg_latency,
              COUNT(*) FILTER (WHERE status >= 400)::int AS errors
         FROM usage`,
      { type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT provider, COUNT(*)::int AS requests,
              COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
              COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
              COALESCE(AVG(latency_ms), 0) AS avg_latency
         FROM usage GROUP BY provider`,
      { type: sequelize.QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT model, COUNT(*)::int AS requests,
              COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
              COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
              COALESCE(AVG(latency_ms), 0) AS avg_latency
         FROM usage GROUP BY model ORDER BY COUNT(*) DESC LIMIT 8`,
      { type: sequelize.QueryTypes.SELECT }
    ),
    Usage.findAll({ order: [["ts", "DESC"]], limit: 12, raw: true }),
  ]);

  const since = Date.now() - days * 86400000;
  const dailyRows = await sequelize.query(
    `SELECT to_char((to_timestamp(ts / 1000.0))::date, 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS requests,
            COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
            COALESCE(SUM(completion_tokens), 0) AS completion_tokens
       FROM usage WHERE ts >= $1 GROUP BY 1 ORDER BY 1`,
    { bind: [since], type: sequelize.QueryTypes.SELECT }
  );
  const byDay = new Map(dailyRows.map((r) => [r.day, r]));
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const row = byDay.get(key);
    daily.push({
      date: key,
      requests: Number(row?.requests ?? 0),
      promptTokens: Number(row?.prompt_tokens ?? 0),
      completionTokens: Number(row?.completion_tokens ?? 0),
    });
  }

  return {
    totals: {
      requests: Number(totals?.requests ?? 0),
      promptTokens: Number(totals?.prompt_tokens ?? 0),
      completionTokens: Number(totals?.completion_tokens ?? 0),
      totalTokens:
        Number(totals?.prompt_tokens ?? 0) + Number(totals?.completion_tokens ?? 0),
      avgLatencyMs: Math.round(Number(totals?.avg_latency ?? 0)),
      errors: Number(totals?.errors ?? 0),
    },
    daily,
    byProvider: providerRows.map((r) => ({
      name: r.provider,
      requests: Number(r.requests),
      promptTokens: Number(r.prompt_tokens),
      completionTokens: Number(r.completion_tokens),
      totalTokens: Number(r.prompt_tokens) + Number(r.completion_tokens),
      avgLatencyMs: Math.round(Number(r.avg_latency)),
    })),
    byModel: modelRows.map((r) => ({
      name: r.model,
      requests: Number(r.requests),
      promptTokens: Number(r.prompt_tokens),
      completionTokens: Number(r.completion_tokens),
      totalTokens: Number(r.prompt_tokens) + Number(r.completion_tokens),
      avgLatencyMs: Math.round(Number(r.avg_latency)),
    })),
    recent: recentRows.map(usageToJSON),
  };
}

async function clearUsage() {
  await Usage.destroy({ where: {} });
}

module.exports = {
  logUsage,
  monthUsageForKey,
  monthUsageByKeys,
  computeStats,
  clearUsage,
};
