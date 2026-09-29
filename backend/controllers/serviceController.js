const { randomUUID } = require("node:crypto");
const { Service } = require("../models");
const { encrypt, decrypt } = require("../utils/crypto");
const { serviceToJSON } = require("../utils/serializers");
const {
  PROVIDER_PRESETS,
  fetchProviderModels,
  syncServiceModels,
} = require("../services/providerService");

async function list() {
  const rows = await Service.findAll({ order: [["createdAt", "ASC"]] });
  return rows.map(serviceToJSON);
}

async function create(request, reply) {
  const { name, type, baseUrl, apiKey } = request.body ?? {};
  if (!name || !type || !baseUrl || !apiKey) {
    return reply.code(400).send({
      error: { message: "name, type, baseUrl and apiKey are required" },
    });
  }
  const service = await Service.create({
    id: randomUUID(),
    name,
    type,
    baseUrl,
    apiKeyEnc: encrypt(apiKey),
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
  const changedConnection =
    (baseUrl && baseUrl !== service.baseUrl) ||
    (apiKey && apiKey !== decrypt(service.apiKeyEnc));
  await service.update({
    name: name ?? service.name,
    type: type ?? service.type,
    baseUrl: baseUrl ?? service.baseUrl,
    apiKeyEnc: apiKey ? encrypt(apiKey) : service.apiKeyEnc,
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

module.exports = { list, create, update, remove, sync, validate };
