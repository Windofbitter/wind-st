import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { LLMConnectionRepositorySqlite } from "../../src/infrastructure/sqlite/LLMConnectionRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { ChatLLMConfigRepositorySqlite } from "../../src/infrastructure/sqlite/ChatLLMConfigRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("LLMConnectionRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: LLMConnectionRepositorySqlite;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new LLMConnectionRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, lists, gets, updates and deletes connections", async () => {
    const created = await repo.create({
      name: "Primary",
      provider: "openai_compatible",
      baseUrl: "http://localhost",
      defaultModel: "gpt-4.1",
      apiKey: "sk-test",
      isEnabled: true,
    });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Primary");

    const fetched = await repo.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.provider).toBe("openai_compatible");
    expect(fetched?.apiKey).toBe("sk-test");

    const updated = await repo.update(created.id, {
      baseUrl: "http://example.com",
      defaultModel: "gpt-4.2",
      apiKey: "sk-updated",
      isEnabled: false,
    });
    expect(updated).not.toBeNull();
    expect(updated?.baseUrl).toBe("http://example.com");
    expect(updated?.apiKey).toBe("sk-updated");
    expect(updated?.isEnabled).toBe(false);

    await repo.delete(created.id);
    const afterDelete = await repo.getById(created.id);
    expect(afterDelete).toBeNull();
  });

  it("rejects deleting a connection that is used by chat configs", async () => {
    const characterRepo = new CharacterRepositorySqlite(db);
    const chatRepo = new ChatRepositorySqlite(db);
    const chatConfigRepo = new ChatLLMConfigRepositorySqlite(db);

    const connection = await repo.create({
      name: "Conn",
      provider: "openai_compatible",
      baseUrl: "http://localhost",
      defaultModel: "gpt",
      apiKey: "sk-test-2",
      isEnabled: true,
    });

    const character = await characterRepo.create({
      name: "Char",
      description: "d",
      persona: "p",
      avatarPath: "/a.png",
      creatorNotes: null,
    });

    const chat = await chatRepo.create({
      characterId: character.id,
      title: "Chat",
    });

    await chatConfigRepo.create({
      chatId: chat.id,
      llmConnectionId: connection.id,
      model: "m",
      temperature: 0.5,
      maxOutputTokens: 128,
    });

    await expect(repo.delete(connection.id)).rejects.toThrow(
      "Cannot delete LLM connection: it is used by one or more chats. Disable it or move those chats to another connection first.",
    );

    const stillThere = await repo.getById(connection.id);
    expect(stillThere).not.toBeNull();
  });
});
