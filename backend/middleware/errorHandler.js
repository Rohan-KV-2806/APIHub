// Gateway routes speak the OpenAI error format; everything else stays generic.
module.exports = function errorHandler(error, request, reply) {
  if (request.url.startsWith("/v1")) {
    return reply.code(error.statusCode || 500).send({
      error: {
        message: error.message,
        type: error.statusCode === 400 ? "invalid_request_error" : "api_error",
      },
    });
  }
  request.log.error(error);
  return reply.code(error.statusCode || 500).send({
    error: { message: error.message || "Internal server error" },
  });
};
