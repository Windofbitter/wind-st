import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

describe("buildApp", () => {
  it("builds an app wired with health route and services", async () => {
    let app: FastifyInstance | undefined;
    try {
      const tempDbPath = path.join(
        os.tmpdir(),
        "wind-st-app-test.db",
      );
      fs.rmSync(tempDbPath, { force: true });
      process.env.SQLITE_PATH = tempDbPath;

      const mod = await import("../../src/infrastructure/http/app");
      const buildApp = mod.buildApp as () => Promise<FastifyInstance>;

      app = await buildApp();

      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });

      expect(app.hasDecorator("characterService")).toBe(true);
      expect(app.hasDecorator("chatService")).toBe(true);
      expect(app.hasDecorator("chatOrchestrator")).toBe(true);
    } finally {
      if (app) {
        await app.close();
      }
      delete process.env.SQLITE_PATH;
    }
  }, 15000);
});
