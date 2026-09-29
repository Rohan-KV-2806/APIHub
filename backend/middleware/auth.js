const { sha256 } = require("../utils/crypto");
const { UnifiedKey } = require("../models");

// Fastify preHandler: resolves a Bearer `socks-…` key and attaches it to the request.
function requireUnifiedKey() {
  return async function (request, reply) {
    const header = request.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
      return reply.code(401).send({
        error: {
          message: "Missing API key. Pass it as: Authorization: Bearer socks-…",
          type: "invalid_request_error",
        },
      });
    }
    const token = header.slice(7).trim();
    const key = await UnifiedKey.findOne({ where: { keyHash: sha256(token) } });
    if (!key) {
      return reply.code(401).send({
        error: { message: "Invalid API key.", type: "invalid_api_key" },
      });
    }
    request.unifiedKey = key;
  };
}

module.exports = { requireUnifiedKey };
