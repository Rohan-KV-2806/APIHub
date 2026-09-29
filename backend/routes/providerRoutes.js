const controller = require("../controllers/providerController");

module.exports = async function providerRoutes(fastify) {
  fastify.get("/api/providers", controller.list);
  fastify.post("/api/providers/validate", controller.validate);
};
