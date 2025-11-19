import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { MessageRepositorySqlite } from "../../src/infrastructure/sqlite/MessageRepositorySqlite";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { createTestDatabase } from "../utils/testDb";

describe("MessageRepositorySqlite", () => {
  let db: SqliteDatabase;
  let repo: MessageRepositorySqlite;
  let chatId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    const characterRepo = new CharacterRepositorySqlite(db);
    const character = await characterRepo.create({
      name: "MsgChar",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/x.png",
      creatorNotes: null,
    });
    const chatRepo = new ChatRepositorySqlite(db);
    const chat = await chatRepo.create({
      characterId: character.id,
      title: "Chat",
    });
    chatId = chat.id;
    repo = new MessageRepositorySqlite(db);
  });

  afterEach(() => {
    db.close();
  });

  it("appends and lists messages with JSON toolCalls/toolResults", async () => {
    const toolCalls = [{ id: "1", name: "tool", args: { x: 1 } }];
    const toolResults = [{ id: "1", result: "ok" }];

    const created = await repo.append({
      chatId,
      role: "assistant",
      content: "Hello",
      toolCalls,
      toolResults,
      tokenCount: 42,
    });

    expect(created.chatId).toBe(chatId);
    expect(created.toolCalls).toEqual(toolCalls);
    expect(created.toolResults).toEqual(toolResults);
    expect(created.tokenCount).toBe(42);

    const list = await repo.listForChat(chatId);
    expect(list).toHaveLength(1);
    expect(list[0].toolCalls).toEqual(toolCalls);
    expect(list[0].toolResults).toEqual(toolResults);
  });

  it("supports pagination via limit and offset", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const msg = await repo.append({
        chatId,
        role: "user",
        content: `m${i}`,
      });
      ids.push(msg.id);
    }

    const firstTwo = await repo.listForChat(chatId, { limit: 2 });
    expect(firstTwo).toHaveLength(2);
    expect(firstTwo.map((m) => m.content)).toEqual(["m0", "m1"]);

    const lastTwo = await repo.listForChat(chatId, { offset: 1 });
    expect(lastTwo).toHaveLength(2);
    expect(lastTwo.map((m) => m.content)).toEqual(["m1", "m2"]);
  });
});

