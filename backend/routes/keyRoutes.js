const controller = require("../controllers/keyController");

module.exports = async function keyRoutes(fastify) {
  fastify.get("/api/keys", controller.list);
  fastify.post("/api/keys", controller.create);
  fastify.put("/api/keys/:id", controller.update);
  fastify.delete("/api/keys/:id", controller.remove);
};
