// Custom providers must have a routable id: it is embedded in model names as
// "type/model-id", so no slashes, spaces or uppercase.
const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

// Providers that ship with the app. Anything else is user-defined.
const PROVIDER_PRESETS = {
  groq: {
    type: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    docsUrl: "https://console.groq.com/keys",
    keyHint: "gsk_...",
    color: "#f55036",
    // Brand marks live in frontend/public/brands and are served at /brands
    // both in dev (Vite) and production (backend serves frontend/dist).
    icon: "/brands/groq.svg",
  },
  deepseek: {
    type: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    docsUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-...",
    color: "#4d6bfe",
    icon: "/brands/deepseek.svg",
  },
};

// Synthetic entry returned by GET /api/providers so the UI can offer an
// "add custom provider" flow without hardcoding anything client-side.
// type is null because a custom provider's id is chosen by the user and is
// stored on the Service, not in the catalog.
const CUSTOM_PROVIDER = {
  type: null,
  name: "Custom provider",
  baseUrl: "",
  keyHint: "Only if the endpoint requires one",
  color: "#64748b",
  custom: true,
};

function isPresetProvider(type) {
  return Object.prototype.hasOwnProperty.call(PROVIDER_PRESETS, type);
}

function isValidProviderType(type) {
  return typeof type === "string" && PROVIDER_ID_PATTERN.test(type);
}

module.exports = {
  PROVIDER_PRESETS,
  CUSTOM_PROVIDER,
  isPresetProvider,
  isValidProviderType,
};
