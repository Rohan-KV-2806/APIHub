const controller = require("../controllers/serviceController");

module.exports = async function serviceRoutes(fastify) {
  fastify.get("/api/services", controller.list);
  fastify.post("/api/services", controller.create);
  fastify.put("/api/services/:id", controller.update);
  fastify.delete("/api/services/:id", controller.remove);
  fastify.post("/api/services/:id/sync", controller.sync);
};
