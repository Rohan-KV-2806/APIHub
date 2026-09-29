const { PROVIDER_PRESETS } = require("../config/providers");
const { decrypt } = require("../utils/crypto");

function providerBase(serviceOrType) {
  if (typeof serviceOrType === "string") {
    const preset = PROVIDER_PRESETS[serviceOrType];
    if (!preset) throw new Error(`Unknown provider type: ${serviceOrType}`);
    return preset.baseUrl;
  }
  return String(serviceOrType.baseUrl || "").replace(/\/$/, "");
}

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function readErrorMessage(res) {
  try {
    const body = await res.json();
    if (body && body.error && body.error.message) return body.error.message;
  } catch {
    /* non-JSON error body */
  }
  return `${res.status} ${res.statusText}`;
}

async function fetchProviderModels({ type, baseUrl, apiKey }) {
  const base = providerBase(baseUrl ? { baseUrl } : type);
  const res = await fetch(`${base}/models`, {
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  const body = await res.json();
  const models = Array.isArray(body.data) ? body.data : [];
  return models
    .map((m) => ({
      id: m.id,
      owned_by: m.owned_by ?? null,
      context_window: m.context_window ?? null,
      created: m.created ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Resolve a requested model id ("provider/model-id" or bare "model-id") to the
// service that provides it. Returns { service, modelId } or null.
function findModelOwner(services, requested) {
  const slash = requested.indexOf("/");
  if (slash > 0) {
    const provider = requested.slice(0, slash);
    const bare = requested.slice(slash + 1);
    for (const service of services) {
      if (service.type === provider && service.models.some((m) => m.id === bare)) {
        return { service, modelId: bare };
      }
    }
  }
  for (const service of services) {
    const model = service.models.find((m) => m.id === requested);
    if (model) return { service, modelId: model.id };
  }
  return null;
}

// Fetches the model list for a service and persists the result (status + models).
async function syncServiceModels(service) {
  try {
    const models = await fetchProviderModels({
      type: service.type,
      baseUrl: service.baseUrl,
      apiKey: decrypt(service.apiKeyEnc),
    });
    await service.update({
      models,
      modelsSyncedAt: Date.now(),
      status: "connected",
      statusMessage: null,
    });
    return models;
  } catch (err) {
    await service.update({
      status: "error",
      statusMessage: err instanceof Error ? err.message : "Connection failed",
    });
    throw err;
  }
}

module.exports = {
  PROVIDER_PRESETS,
  fetchProviderModels,
  findModelOwner,
  syncServiceModels,
  readErrorMessage,
};
