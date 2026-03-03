import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation Error",
        issues: error.issues,
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: error.name || "Error",
        message: error.message,
      });
    }

    fastify.log.error(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  });
};

export default fp(errorHandler, { name: "error-handler" });
