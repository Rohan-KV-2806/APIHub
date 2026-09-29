const { randomUUID } = require("node:crypto");
const { Service } = require("../models");
const { PROVIDER_PRESETS, isValidProviderType } = require("../config/providers");
const { encrypt, decrypt } = require("../utils/crypto");
const { serviceToJSON } = require("../utils/serializers");
const { syncServiceModels } = require("../services/providerService");

async function list() {
  const rows = await Service.findAll({ order: [["createdAt", "ASC"]] });
  return rows.map(serviceToJSON);
}

// Normalizes a provider type from user input, or null when invalid.
function normalizeType(raw) {
  const providerType = String(raw ?? "").trim().toLowerCase();
  return isValidProviderType(providerType) ? providerType : null;
}

const INVALID_TYPE_MESSAGE =
  "type must be a lowercase provider id (letters, digits, dot, dash or underscore)";

async function create(request, reply) {
  const { name, type, baseUrl, apiKey } = request.body ?? {};
  if (!name || !String(name).trim()) {
    return reply.code(400).send({ error: { message: "name is required" } });
  }
  if (!type) {
    return reply.code(400).send({ error: { message: "type is required" } });
  }
  const providerType = normalizeType(type);
  if (!providerType) {
    return reply.code(400).send({ error: { message: INVALID_TYPE_MESSAGE } });
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

  const service = await Service.create({
    id: randomUUID(),
    name: String(name).trim(),
    type: providerType,
    baseUrl: endpoint,
    apiKeyEnc: encrypt(key),
    createdAt: Date.now(),
    models: [],
    status: "untested",
  });
  try {
    await syncServiceModels(service);
  } catch {
    /* status + message already recorded on the row */
  }
  await service.reload();
  return reply.code(201).send(serviceToJSON(service));
}

async function update(request, reply) {
  const service = await Service.findByPk(request.params.id);
  if (!service) {
    return reply.code(404).send({ error: { message: "Service not found" } });
  }
  const { name, type, baseUrl, apiKey } = request.body ?? {};

  let providerType = service.type;
  if (type !== undefined && String(type).trim().toLowerCase() !== service.type) {
    const normalized = normalizeType(type);
    if (!normalized) {
      return reply.code(400).send({ error: { message: INVALID_TYPE_MESSAGE } });
    }
    providerType = normalized;
  }
  const preset = PROVIDER_PRESETS[providerType];

  const cleanBaseUrl = baseUrl !== undefined ? String(baseUrl).trim() : service.baseUrl;
  const endpoint =
    cleanBaseUrl || (providerType !== service.type ? preset?.baseUrl : undefined) || service.baseUrl;

  const newKey = apiKey !== undefined ? String(apiKey) : decrypt(service.apiKeyEnc);
  if (preset && !newKey) {
    return reply.code(400).send({
      error: { message: `apiKey is required for provider "${providerType}"` },
    });
  }

  const changedConnection = endpoint !== service.baseUrl || newKey !== decrypt(service.apiKeyEnc);

  await service.update({
    name:
      name !== undefined && String(name).trim() !== "" ? String(name).trim() : service.name,
    type: providerType,
    baseUrl: endpoint,
    apiKeyEnc: apiKey !== undefined ? encrypt(newKey) : service.apiKeyEnc,
  });
  if (changedConnection) {
    try {
      await syncServiceModels(service);
    } catch {
      /* recorded on the row */
    }
    await service.reload();
  }
  return serviceToJSON(service);
}

async function remove(request, reply) {
  const deleted = await Service.destroy({ where: { id: request.params.id } });
  if (!deleted) {
    return reply.code(404).send({ error: { message: "Service not found" } });
  }
  return { ok: true };
}

async function sync(request, reply) {
  const service = await Service.findByPk(request.params.id);
  if (!service) {
    return reply.code(404).send({ error: { message: "Service not found" } });
  }
  try {
    const models = await syncServiceModels(service);
    return { models };
  } catch (err) {
    return reply.code(502).send({
      error: { message: err instanceof Error ? err.message : "Sync failed" },
    });
  }
}

module.exports = { list, create, update, remove, sync };
