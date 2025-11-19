import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { ChatLLMConfigRepositorySqlite } from "../../src/infrastructure/sqlite/ChatLLMConfigRepositorySqlite";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { LLMConnectionRepositorySqlite } from "../../src/infrastructure/sqlite/LLMConnectionRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("ChatLLMConfigRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: ChatLLMConfigRepositorySqlite;
  let chatId: string;
  let llmConnectionId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    const characterRepo = new CharacterRepositorySqlite(db);
    const character = await characterRepo.create({
      name: "ConfigChar",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/x.png",
      creatorNotes: null,
    });

    const chatRepo = new ChatRepositorySqlite(db);
    const chat = await chatRepo.create({
      characterId: character.id,
      title: "ConfigChat",
    });
    chatId = chat.id;

    const connectionRepo = new LLMConnectionRepositorySqlite(db);
    const connection = await connectionRepo.create({
      name: "Conn",
      provider: "openai_compatible",
      baseUrl: "http://example",
      defaultModel: "gpt-test",
      apiKey: "sk-config",
      isEnabled: true,
    });
    llmConnectionId = connection.id;

    repo = new ChatLLMConfigRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates, gets, updates and deletes by chat id", async () => {
    const created = await repo.create({
      chatId,
      llmConnectionId,
      model: "model-1",
      temperature: 0.5,
      maxOutputTokens: 256,
    });
    expect(created.chatId).toBe(chatId);
    expect(created.llmConnectionId).toBe(llmConnectionId);

    const fetched = await repo.getByChatId(chatId);
    expect(fetched).not.toBeNull();
    expect(fetched?.model).toBe("model-1");

    const updated = await repo.updateByChatId(chatId, {
      model: "model-2",
      temperature: 0.8,
    });
    expect(updated).not.toBeNull();
    expect(updated?.model).toBe("model-2");
    expect(updated?.temperature).toBe(0.8);

    await repo.deleteByChatId(chatId);
    const afterDelete = await repo.getByChatId(chatId);
    expect(afterDelete).toBeNull();
  });
});
