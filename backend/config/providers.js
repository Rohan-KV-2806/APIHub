const PROVIDER_PRESETS = {
  groq: {
    type: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    docsUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    type: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
};

module.exports = { PROVIDER_PRESETS };
