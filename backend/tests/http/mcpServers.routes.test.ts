import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("MCP server routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("registers and lists MCP servers", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const createResponse = await app.inject({
      method: "POST",
      url: "/mcp-servers",
      payload: {
        name: "tools",
        command: "node",
        args: ["server.js"],
        env: { NODE_ENV: "test" },
        isEnabled: true,
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: "/mcp-servers",
    });

    expect(listResponse.statusCode).toBe(200);
    const servers = listResponse.json() as Array<{ name: string }>;
    expect(servers.map((s) => s.name)).toContain("tools");
  });

  it("validates env payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/mcp-servers",
      payload: {
        name: "broken",
        command: "node",
        args: [],
        env: { NODE_ENV: 123 },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});

