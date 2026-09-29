const { Service } = require("../models");
const { decrypt } = require("../utils/crypto");
const { findModelOwner, readErrorMessage } = require("../services/providerService");
const { logUsage, monthUsageForKey } = require("../services/usageService");

function estimateTokens(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

async function listModels(request) {
  const services = await Service.findAll({ order: [["createdAt", "ASC"]] });
  const data = [];
  for (const service of services) {
    for (const model of service.models ?? []) {
      data.push({
        id: `${service.type}/${model.id}`,
        object: "model",
        owned_by: model.owned_by ?? service.name,
        context_window: model.context_window ?? null,
        created: model.created ?? null,
      });
    }
  }
  return { object: "list", data };
}

async function chatCompletions(request, reply) {
  const key = request.unifiedKey;
  const { model, messages, stream, temperature } = request.body ?? {};

  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return reply.code(400).send({
      error: {
        message: "model and a non-empty messages array are required.",
        type: "invalid_request_error",
      },
    });
  }

  const month = await monthUsageForKey(key.id);
  if (key.monthlyRequests != null && month.requests >= Number(key.monthlyRequests)) {
    return reply.code(429).send({
      error: { message: `Monthly request limit reached for key "${key.name}".`, type: "rate_limit_error" },
    });
  }
  if (key.monthlyTokens != null && month.totalTokens >= Number(key.monthlyTokens)) {
    return reply.code(429).send({
      error: { message: `Monthly token limit reached for key "${key.name}".`, type: "rate_limit_error" },
    });
  }

  const services = await Service.findAll();
  const owner = findModelOwner(services, model);
  if (!owner) {
    return reply.code(404).send({
      error: {
        message: `Model "${model}" is not available. Use "provider/model-id" — see GET /v1/models for the full catalog.`,
        type: "model_not_found",
      },
    });
  }

  const service = owner.service;
  const apiKey = decrypt(service.apiKeyEnc);
  const base = String(service.baseUrl).replace(/\/$/, "");

  let upstream;
  try {
    upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: owner.modelId,
        messages,
        temperature: temperature ?? 0.7,
        stream: Boolean(stream),
        ...(stream ? { stream_options: { include_usage: true } } : {}),
      }),
      signal: AbortSignal.timeout(300000),
    });
  } catch (err) {
    return reply.code(502).send({
      error: {
        message: `Provider unreachable: ${err instanceof Error ? err.message : "network error"}`,
        type: "api_error",
      },
    });
  }

  if (!upstream.ok) {
    const message = await readErrorMessage(upstream);
    return reply.code(upstream.status).send({ error: { message, type: "api_error" } });
  }

  const started = Date.now();
  const log = async (usage, status, streamed) => {
    const promptText = messages.map((m) => String(m.content ?? "")).join("\n");
    const promptTokens = usage?.prompt_tokens ?? estimateTokens(promptText);
    const completionTokens = usage?.completion_tokens ?? 0;
    await logUsage({
      keyId: key.id,
      keyName: key.name,
      serviceId: service.id,
      provider: service.type,
      model: `${service.type}/${owner.modelId}`,
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
      latencyMs: Date.now() - started,
      status,
      stream: streamed,
    });
  };

  if (!stream) {
    const body = await upstream.json();
    await log(body.usage, upstream.status, false);
    return body;
  }

  // Streaming: take over the raw response and pipe SSE through while
  // parsing chunks for the final usage payload.
  reply.hijack();
  reply.raw.writeHead(upstream.status, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  const decoder = new TextDecoder();
  let buffer = "";
  let usage = null;

  try {
    for await (const chunk of upstream.body) {
      reply.raw.write(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.usage) {
            usage = {
              prompt_tokens: parsed.usage.prompt_tokens ?? 0,
              completion_tokens: parsed.usage.completion_tokens ?? 0,
              total_tokens: parsed.usage.total_tokens ?? 0,
            };
          }
        } catch {
          /* partial or non-JSON line */
        }
      }
    }
    reply.raw.end();
    await log(usage, upstream.status, true);
  } catch (err) {
    request.log.error(err, "stream proxy error");
    reply.raw.end();
    await log(usage, 502, true);
  }
}

module.exports = { listModels, chatCompletions };
