const PROVIDER_PRESETS = {
  groq: {
    type: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    docsUrl: "https://console.groq.com/keys",
    keyHint: "gsk_...",
    color: "#f55036",
  },
  deepseek: {
    type: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    docsUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-...",
    color: "#4d6bfe",
  },
};

module.exports = { PROVIDER_PRESETS };
