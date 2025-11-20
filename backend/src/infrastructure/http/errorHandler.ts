import type { FastifyError, FastifyInstance } from "fastify";
import { AppError, isAppError } from "../../application/errors/AppError";

interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, request, reply) => {
    if (isAppError(err)) {
      const body: ApiErrorBody = {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      };

      const status = err.status || 500;
      if (status >= 500) {
        request.log.error({ err }, "AppError (server error)");
      } else {
        request.log.info({ err }, "AppError (client error)");
      }

      void reply.status(status).send(body);
      return;
    }

    const fastifyError = err as FastifyError & {
      validation?: unknown;
    };

    if (fastifyError.validation) {
      const body: ApiErrorBody = {
        code: "VALIDATION_ERROR",
        message: fastifyError.message,
        details: fastifyError.validation,
      };

      void reply.status(400).send(body);
      return;
    }

    request.log.error({ err }, "Unhandled error");

    const body: ApiErrorBody = {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    };

    void reply.status(500).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiErrorBody = {
      code: "NOT_FOUND",
      message: "Route not found",
    };

    void reply.status(404).send(body);
  });
}

