const { PROVIDER_PRESETS } = require("../config/providers");
const { fetchProviderModels } = require("../services/providerService");

// Public provider catalog — the frontend hardcodes nothing about providers.
async function list() {
  return Object.values(PROVIDER_PRESETS);
}

// Validates an endpoint + key without persisting anything (used by the
// add-service dialog to auto-load the model list).
async function validate(request, reply) {
  const { type, baseUrl, apiKey } = request.body ?? {};
  if (!type || !apiKey) {
    return reply.code(400).send({ error: { message: "type and apiKey are required" } });
  }
  try {
    const models = await fetchProviderModels({
      type,
      baseUrl: baseUrl || PROVIDER_PRESETS[type]?.baseUrl,
      apiKey,
    });
    return { ok: true, models };
  } catch (err) {
    return reply.code(400).send({
      error: { message: err instanceof Error ? err.message : "Validation failed" },
    });
  }
}

module.exports = { list, validate };
