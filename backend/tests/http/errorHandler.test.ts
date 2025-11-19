import { afterEach, describe, expect, it } from "vitest";
import Fastify, {
  type FastifyError,
  type FastifyInstance,
} from "fastify";
import { registerErrorHandler } from "../../src/infrastructure/http/errorHandler";

describe("registerErrorHandler", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("maps errors with validation field to VALIDATION_ERROR", async () => {
    app = Fastify({ logger: false });
    registerErrorHandler(app);

    app.get("/validation-error", async () => {
      const err = new Error("Payload is invalid") as FastifyError & {
        validation?: unknown;
      };
      (err as any).validation = [{ field: "name" }];
      throw err;
    });

    const response = await app.inject({
      method: "GET",
      url: "/validation-error",
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Payload is invalid");
    expect(body.error.details).toEqual([{ field: "name" }]);
  });

  it("maps generic errors to INTERNAL_ERROR", async () => {
    app = Fastify({ logger: false });
    registerErrorHandler(app);

    app.get("/generic-error", async () => {
      throw new Error("Boom");
    });

    const response = await app.inject({
      method: "GET",
      url: "/generic-error",
    });

    expect(response.statusCode).toBe(500);
    const body = response.json() as any;
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
  });

  it("maps unknown routes to NOT_FOUND", async () => {
    app = Fastify({ logger: false });
    registerErrorHandler(app);

    const response = await app.inject({
      method: "GET",
      url: "/does-not-exist",
    });

    expect(response.statusCode).toBe(404);
    const body = response.json() as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
