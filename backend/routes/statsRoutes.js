const controller = require("../controllers/statsController");

module.exports = async function statsRoutes(fastify) {
  fastify.get("/api/stats", controller.stats);
  fastify.delete("/api/usage", controller.reset);
};
