import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("Preset routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("creates and filters presets", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    await app.inject({
      method: "POST",
      url: "/presets",
      payload: {
        title: "Static",
        description: "d",
        kind: "static_text",
        content: "text",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/presets?kind=static_text",
    });

    expect(listResponse.statusCode).toBe(200);
    const presets = listResponse.json() as Array<{ title: string }>;
    expect(presets.map((p) => p.title)).toContain("Static");
  });

  it("validates preset payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/presets",
      payload: {
        title: "",
        description: 1,
        kind: "invalid",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

