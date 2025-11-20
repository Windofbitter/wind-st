import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("Character routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("creates and fetches a character", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const createResponse = await app.inject({
      method: "POST",
      url: "/characters",
      payload: {
        name: "Alice",
        description: "desc",
        persona: "persona",
        avatarPath: "/avatars/a.png",
        creatorNotes: "notes",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { id: string; name: string };
    expect(created.name).toBe("Alice");

    const getResponse = await app.inject({
      method: "GET",
      url: `/characters/${created.id}`,
    });

    expect(getResponse.statusCode).toBe(200);
    const fetched = getResponse.json() as { id: string; name: string };
    expect(fetched.id).toBe(created.id);
  });

  it("validates create payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/characters",
      payload: { invalid: true },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for missing character", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "GET",
      url: "/characters/non-existent",
    });

    expect(response.statusCode).toBe(404);
    const body = response.json() as any;
    expect(body.code).toBe("CHARACTER_NOT_FOUND");
  });
});

