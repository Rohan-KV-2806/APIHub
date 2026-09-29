module.exports = async function routes(fastify) {
  await fastify.register(require("./systemRoutes"));
  await fastify.register(require("./providerRoutes"));
  await fastify.register(require("./serviceRoutes"));
  await fastify.register(require("./keyRoutes"));
  await fastify.register(require("./statsRoutes"));
  await fastify.register(require("./gatewayRoutes"));
};
