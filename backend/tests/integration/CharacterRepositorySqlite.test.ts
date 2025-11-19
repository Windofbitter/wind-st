import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { MessageRepositorySqlite } from "../../src/infrastructure/sqlite/MessageRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("CharacterRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: CharacterRepositorySqlite;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new CharacterRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, lists, updates and deletes characters", async () => {
    const alice = await repo.create({
      name: "Alice",
      description: "First test character",
      persona: "Curious",
      avatarPath: "/avatars/alice.png",
      creatorNotes: "note-1",
    });

    const bob = await repo.create({
      name: "Bob",
      description: "Second test character",
      persona: "Grumpy",
      avatarPath: "/avatars/bob.png",
      creatorNotes: null,
    });

    const fetched = await repo.getById(alice.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Alice");
    expect(fetched?.creatorNotes).toBe("note-1");

    const all = await repo.list();
    expect(all.map((c) => c.name)).toEqual(["Alice", "Bob"]);

    const filtered = await repo.list({ nameContains: "li" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Alice");

    const updated = await repo.update(alice.id, {
      description: "Updated",
      creatorNotes: null,
    });
    expect(updated).not.toBeNull();
    expect(updated?.description).toBe("Updated");
    expect(updated?.creatorNotes).toBeNull();

    await repo.delete(bob.id);
    const afterDelete = await repo.getById(bob.id);
    expect(afterDelete).toBeNull();
  });

  it("returns existing character when update patch is empty", async () => {
    const char = await repo.create({
      name: "NoPatch",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/x.png",
      creatorNotes: null,
    });

    const result = await repo.update(char.id, {});
    expect(result).not.toBeNull();
    expect(result?.id).toBe(char.id);
    expect(result?.name).toBe("NoPatch");
  });

  it("cascades delete to chats and messages via foreign keys", async () => {
    const character = await repo.create({
      name: "Cascade",
      description: "FK test",
      persona: "Tester",
      avatarPath: "/avatars/cascade.png",
      creatorNotes: null,
    });

    const chatRepo = new ChatRepositorySqlite(db);
    const chat = await chatRepo.create({
      characterId: character.id,
      title: "Chat-1",
    });

    const messageRepo = new MessageRepositorySqlite(db);
    await messageRepo.append({
      chatId: chat.id,
      role: "user",
      content: "Hello",
    });

    const beforeChats = await chatRepo.list({ characterId: character.id });
    expect(beforeChats).toHaveLength(1);
    const beforeMessages = await messageRepo.listForChat(chat.id);
    expect(beforeMessages).toHaveLength(1);

    await repo.delete(character.id);

    const afterChats = await chatRepo.list({ characterId: character.id });
    expect(afterChats).toHaveLength(0);
    const afterMessages = await messageRepo.listForChat(chat.id);
    expect(afterMessages).toHaveLength(0);
  });
}
);

