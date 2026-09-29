const path = require("path");
const fs = require("fs");
const Fastify = require("fastify");
const cors = require("@fastify/cors");
const fastifyStatic = require("@fastify/static");
const { sequelize, ensureDatabase } = require("./database");

// Register models on the sequelize instance before schema sync.
require("./models");

const fastify = Fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024,
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "localhost";
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

fastify.setErrorHandler(require("./middleware/errorHandler"));

async function registerPlugins() {
  await fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  await fastify.register(require("./routes"));

  // Serve the built frontend when available (single-process production mode).
  if (fs.existsSync(FRONTEND_DIST)) {
    await fastify.register(fastifyStatic, {
      root: FRONTEND_DIST,
      prefix: "/",
    });
    fastify.setNotFoundHandler((request, reply) => {
      if (
        request.method === "GET" &&
        !request.url.startsWith("/api") &&
        !request.url.startsWith("/v1")
      ) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: { message: "Not found" } });
    });
  }
}

const start = async () => {
  try {
    await ensureDatabase();
    await sequelize.authenticate();

    console.log("✅ PostgreSQL connection successful");

    await sequelize.sync();
    console.log("✅ Database schema synced");

    await registerPlugins();

    await fastify.listen({
      port: PORT,
      host: HOST,
    });

    console.log(`🚀 APIHub backend running on http://${HOST}:${PORT}`);
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);

    process.exit(1);
  }
};

start();
