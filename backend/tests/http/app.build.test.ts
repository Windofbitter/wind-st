import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import type { FastifyInstance } from "fastify";

describe("buildApp", () => {
  it("builds an app wired with health route and services", async () => {
    const originalCwd = process.cwd();
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "wind-st-backend-app-"),
    );

    const config = {
      database: {
        sqlitePath: "./app-test.db",
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, "config.json"),
      JSON.stringify(config),
      "utf8",
    );

    let app: FastifyInstance | undefined;
    try {
      process.chdir(tmpDir);
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
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 15000);
});
