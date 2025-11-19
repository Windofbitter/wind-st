import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("LLM connection routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("creates and lists connections", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const createResponse = await app.inject({
      method: "POST",
      url: "/llm-connections",
      payload: {
        name: "Primary",
        provider: "openai_compatible",
        baseUrl: "http://example",
        defaultModel: "gpt-4.1",
        apiKey: "sk-test",
        isEnabled: true,
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: "/llm-connections",
    });

    expect(listResponse.statusCode).toBe(200);
    const connections = listResponse.json() as Array<{ name: string }>;
    expect(connections.map((c) => c.name)).toContain("Primary");
  });

  it("validates provider and payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/llm-connections",
      payload: {
        name: "Broken",
        provider: "other",
        baseUrl: "http://example",
        defaultModel: "gpt",
        apiKey: "sk",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

