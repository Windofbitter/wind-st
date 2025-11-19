import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { LorebookRepositorySqlite } from "../../src/infrastructure/sqlite/LorebookRepositorySqlite";
import { LorebookEntryRepositorySqlite } from "../../src/infrastructure/sqlite/LorebookEntryRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("LorebookEntryRepositorySqlite", () => {
  let db: SqliteDatabase;
  let lorebookRepo: LorebookRepositorySqlite;
  let entryRepo: LorebookEntryRepositorySqlite;
  let lorebookId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    lorebookRepo = new LorebookRepositorySqlite(db);
    const lorebook = await lorebookRepo.create({
      name: "Book",
      description: "desc",
    });
    lorebookId = lorebook.id;
    entryRepo = new LorebookEntryRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, lists, updates and deletes entries with JSON keywords", async () => {
    const entry1 = await entryRepo.create({
      lorebookId,
      keywords: ["foo", "bar"],
      content: "Entry 1",
      insertionOrder: 0,
      isEnabled: true,
    });
    const entry2 = await entryRepo.create({
      lorebookId,
      keywords: ["baz"],
      content: "Entry 2",
      insertionOrder: 1,
      isEnabled: false,
    });

    const fetched = await entryRepo.getById(entry1.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.keywords).toEqual(["foo", "bar"]);
    expect(fetched?.isEnabled).toBe(true);

    const list = await entryRepo.listByLorebook(lorebookId);
    expect(list.map((e) => e.id)).toEqual([entry1.id, entry2.id]);

    const updated = await entryRepo.update(entry2.id, {
      keywords: ["updated"],
      content: "Updated content",
      insertionOrder: 2,
      isEnabled: true,
    });
    expect(updated).not.toBeNull();
    expect(updated?.keywords).toEqual(["updated"]);
    expect(updated?.insertionOrder).toBe(2);
    expect(updated?.isEnabled).toBe(true);

    await entryRepo.delete(entry1.id);
    const afterDelete = await entryRepo.getById(entry1.id);
    expect(afterDelete).toBeNull();
  });

  it("cascades delete when lorebook is removed", async () => {
    const entry = await entryRepo.create({
      lorebookId,
      keywords: ["a"],
      content: "c",
      insertionOrder: 0,
      isEnabled: true,
    });
    const before = await entryRepo.listByLorebook(lorebookId);
    expect(before).toHaveLength(1);

    await lorebookRepo.delete(lorebookId);

    const after = await entryRepo.listByLorebook(lorebookId);
    expect(after).toHaveLength(0);

    const fetched = await entryRepo.getById(entry.id);
    expect(fetched).toBeNull();
  });
});

