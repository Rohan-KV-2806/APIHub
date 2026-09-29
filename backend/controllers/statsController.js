const { computeStats, clearUsage } = require("../services/usageService");

async function stats(request) {
  const days = Math.min(90, Math.max(1, Number(request.query.days) || 14));
  return computeStats(days);
}

async function reset() {
  await clearUsage();
  return { ok: true };
}

module.exports = { stats, reset };
