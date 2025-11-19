import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { PresetRepositorySqlite } from "../../src/infrastructure/sqlite/PresetRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("PresetRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: PresetRepositorySqlite;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new PresetRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, lists, gets, updates and deletes presets", async () => {
    const builtIn = await repo.create({
      title: "BuiltIn",
      description: "builtin preset",
      kind: "static_text",
      content: "Hello",
      builtIn: true,
    });
    const custom = await repo.create({
      title: "Custom",
      description: "custom preset",
      kind: "static_text",
      content: null,
      builtIn: false,
    });

    const fetched = await repo.getById(builtIn.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.builtIn).toBe(true);

    const builtInFiltered = await repo.list({ builtIn: true });
    expect(builtInFiltered).toHaveLength(1);
    expect(builtInFiltered[0].id).toBe(builtIn.id);

    const titleFiltered = await repo.list({ titleContains: "Cust" });
    expect(titleFiltered).toHaveLength(1);
    expect(titleFiltered[0].id).toBe(custom.id);

    const updated = await repo.update(custom.id, {
      content: "Updated",
      builtIn: true,
    });
    expect(updated).not.toBeNull();
    expect(updated?.content).toBe("Updated");
    expect(updated?.builtIn).toBe(true);

    await repo.delete(builtIn.id);
    const afterDelete = await repo.getById(builtIn.id);
    expect(afterDelete).toBeNull();
  });

  it("returns existing preset when update patch is empty", async () => {
    const preset = await repo.create({
      title: "NoPatch",
      description: "desc",
      kind: "static_text",
      content: null,
      builtIn: false,
    });

    const result = await repo.update(preset.id, {});
    expect(result).not.toBeNull();
    expect(result?.id).toBe(preset.id);
  });
});

