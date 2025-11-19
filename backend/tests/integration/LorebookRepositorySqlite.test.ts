import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { LorebookRepositorySqlite } from "../../src/infrastructure/sqlite/LorebookRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("LorebookRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: LorebookRepositorySqlite;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new LorebookRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, lists, updates and deletes lorebooks", async () => {
    const global = await repo.create({
      name: "Global",
      description: "Global lorebook",
    });
    const local = await repo.create({
      name: "Local",
      description: "Local lorebook",
    });

    const fetched = await repo.getById(global.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Global");

    const nameFiltered = await repo.list({ nameContains: "Loc" });
    expect(nameFiltered).toHaveLength(1);
    expect(nameFiltered[0].id).toBe(local.id);

    const updated = await repo.update(local.id, {
      description: "Updated",
    });
    expect(updated).not.toBeNull();
    expect(updated?.description).toBe("Updated");

    await repo.delete(global.id);
    const afterDelete = await repo.getById(global.id);
    expect(afterDelete).toBeNull();
  });

  it("returns existing lorebook when update patch is empty", async () => {
    const lorebook = await repo.create({
      name: "NoPatch",
      description: "desc",
    });

    const result = await repo.update(lorebook.id, {});
    expect(result).not.toBeNull();
    expect(result?.id).toBe(lorebook.id);
  });
});

