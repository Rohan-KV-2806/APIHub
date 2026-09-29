const controller = require("../controllers/gatewayController");
const { requireUnifiedKey } = require("../middleware/auth");

module.exports = async function gatewayRoutes(fastify) {
  fastify.get("/v1/models", { preHandler: requireUnifiedKey() }, controller.listModels);
  fastify.post(
    "/v1/chat/completions",
    { preHandler: requireUnifiedKey() },
    controller.chatCompletions
  );
};
