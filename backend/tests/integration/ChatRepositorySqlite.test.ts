import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("ChatRepositorySqlite", () => {
  let db: SqliteDatabase;
  let chatRepo: ChatRepositorySqlite;
  let characterId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    const characterRepo = new CharacterRepositorySqlite(db);
    const character = await characterRepo.create({
      name: "ChatOwner",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/owner.png",
      creatorNotes: null,
    });
    characterId = character.id;
    chatRepo = new ChatRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, lists, updates and deletes chats", async () => {
    const chat1 = await chatRepo.create({
      characterId,
      title: "First",
    });
    const chat2 = await chatRepo.create({
      characterId,
      title: "Second",
    });

    const fetched = await chatRepo.getById(chat1.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("First");

    const all = await chatRepo.list({ characterId });
    // list is ordered by created_at DESC, so Second comes first
    expect(all.map((c) => c.id)).toEqual([chat2.id, chat1.id]);

    const updated = await chatRepo.update(chat1.id, {
      title: "Updated title",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Updated title");
    expect(updated?.updatedAt).toBe("2020-01-01T00:00:00.000Z");

    await chatRepo.delete(chat2.id);
    const afterDelete = await chatRepo.getById(chat2.id);
    expect(afterDelete).toBeNull();
  });

  it("returns existing chat when update patch is empty", async () => {
    const chat = await chatRepo.create({
      characterId,
      title: "NoPatch",
    });

    const result = await chatRepo.update(chat.id, {});
    expect(result).not.toBeNull();
    expect(result?.id).toBe(chat.id);
    expect(result?.title).toBe("NoPatch");
  });
});

