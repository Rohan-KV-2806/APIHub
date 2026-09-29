const {
  PROVIDER_PRESETS,
  CUSTOM_PROVIDER,
  isValidProviderType,
} = require("../config/providers");
const { fetchProviderModels } = require("../services/providerService");

// Public provider catalog — the frontend hardcodes nothing about providers.
// The custom entry lets the UI offer arbitrary OpenAI-compatible endpoints.
async function list() {
  return [...Object.values(PROVIDER_PRESETS), CUSTOM_PROVIDER];
}

// Validates an endpoint + key without persisting anything (used by the
// add-service dialog to auto-load the model list). Built-in providers get
// their endpoint from the catalog and require a key; custom providers must
// supply a baseUrl and may have no key (local/self-hosted endpoints).
async function validate(request, reply) {
  const { type, baseUrl, apiKey } = request.body ?? {};
  if (!type) {
    return reply.code(400).send({ error: { message: "type is required" } });
  }
  const providerType = String(type).trim().toLowerCase();
  if (!isValidProviderType(providerType)) {
    return reply.code(400).send({
      error: {
        message:
          "type must be a lowercase provider id (letters, digits, dot, dash or underscore)",
      },
    });
  }
  const preset = PROVIDER_PRESETS[providerType];
  const endpoint = baseUrl && String(baseUrl).trim() ? String(baseUrl).trim() : preset?.baseUrl;
  if (!endpoint) {
    return reply.code(400).send({
      error: { message: `baseUrl is required for custom provider "${providerType}"` },
    });
  }
  const key = apiKey ? String(apiKey) : "";
  if (preset && !key) {
    return reply.code(400).send({
      error: { message: `apiKey is required for provider "${providerType}"` },
    });
  }
  try {
    const models = await fetchProviderModels({
      type: providerType,
      baseUrl: endpoint,
      apiKey: key,
    });
    return { ok: true, models };
  } catch (err) {
    return reply.code(400).send({
      error: { message: err instanceof Error ? err.message : "Validation failed" },
    });
  }
}

module.exports = { list, validate };
