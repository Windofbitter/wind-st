import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { MCPServerRepositorySqlite } from "../../src/infrastructure/sqlite/MCPServerRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("MCPServerRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: MCPServerRepositorySqlite;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new MCPServerRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, lists, gets, updates and deletes servers with JSON args/env", async () => {
    const created = await repo.create({
      name: "ServerA",
      command: "node",
      args: ["server.js", "--port", "3000"],
      env: { NODE_ENV: "test", FOO: "bar" },
      isEnabled: true,
    });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("ServerA");
    expect(list[0].args).toEqual(["server.js", "--port", "3000"]);
    expect(list[0].env).toEqual({ NODE_ENV: "test", FOO: "bar" });
    expect(list[0].isEnabled).toBe(true);
    expect(list[0].status).toBe("unknown");
    expect(list[0].lastCheckedAt).toBeNull();
    expect(list[0].toolCount).toBeNull();

    const fetched = await repo.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.env).toEqual({ NODE_ENV: "test", FOO: "bar" });

    const updated = await repo.update(created.id, {
      args: ["server.js"],
      env: { NODE_ENV: "production" },
      isEnabled: false,
      status: "ok",
      lastCheckedAt: "2024-01-02T00:00:00.000Z",
      toolCount: 5,
    });
    expect(updated).not.toBeNull();
    expect(updated?.args).toEqual(["server.js"]);
    expect(updated?.env).toEqual({ NODE_ENV: "production" });
    expect(updated?.isEnabled).toBe(false);
    expect(updated?.status).toBe("ok");
    expect(updated?.lastCheckedAt).toBe("2024-01-02T00:00:00.000Z");
    expect(updated?.toolCount).toBe(5);

    await repo.delete(created.id);
    const afterDelete = await repo.getById(created.id);
    expect(afterDelete).toBeNull();
  });

  it("returns existing server when update patch is empty", async () => {
    const server = await repo.create({
      name: "NoPatch",
      command: "node",
      args: [],
      env: {},
      isEnabled: true,
    });

    const result = await repo.update(server.id, {});
    expect(result).not.toBeNull();
    expect(result?.id).toBe(server.id);
  });
});

