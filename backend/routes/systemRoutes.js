const controller = require("../controllers/systemController");

module.exports = async function systemRoutes(fastify) {
  fastify.get("/api/health", controller.health);
  fastify.post("/api/migrate", controller.migrate);
};
