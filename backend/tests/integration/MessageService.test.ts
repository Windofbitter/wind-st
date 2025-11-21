import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MessageService } from "../../src/application/services/MessageService";
import { MessageRepositorySqlite } from "../../src/infrastructure/sqlite/MessageRepositorySqlite";
import { ChatRunRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRunRepositorySqlite";
import { CharacterRepositorySqlite } from "../../src/infrastructure/sqlite/CharacterRepositorySqlite";
import { ChatRepositorySqlite } from "../../src/infrastructure/sqlite/ChatRepositorySqlite";
import { createDefaultUserPersona, createTestDatabase } from "../utils/testDb";
import type { SqliteDatabase } from "../../src/infrastructure/sqlite/db";
import { AppError } from "../../src/application/errors/AppError";

describe("MessageService", () => {
  let db: SqliteDatabase;
  let messageService: MessageService;
  let messageRepo: MessageRepositorySqlite;
  let chatRunRepo: ChatRunRepositorySqlite;
  let chatId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    const characterRepo = new CharacterRepositorySqlite(db);
    const character = await characterRepo.create({
      name: "User",
      description: "desc",
      persona: "persona",
      avatarPath: "/avatars/u.png",
      creatorNotes: null,
    });
    const persona = await createDefaultUserPersona(db);

    const chatRepo = new ChatRepositorySqlite(db);
    const chat = await chatRepo.create({
      characterId: character.id,
      userPersonaId: persona.id,
      title: "Chat",
    });
    chatId = chat.id;

    messageRepo = new MessageRepositorySqlite(db);
    chatRunRepo = new ChatRunRepositorySqlite(db);
    messageService = new MessageService(messageRepo, chatRunRepo);
  });

  afterEach(() => {
    db.close();
  });

  it("prunes trailing messages and runs after a user message", async () => {
    const user0 = await messageRepo.append({
      chatId,
      role: "user",
      content: "u0",
    });
    const user0Run = await chatRunRepo.create({
      chatId,
      userMessageId: user0.id,
      status: "completed",
      startedAt: new Date().toISOString(),
    });

    const user1 = await messageRepo.append({
      chatId,
      role: "user",
      content: "u1",
    });
    const assistant1 = await messageRepo.append({
      chatId,
      role: "assistant",
      content: "a1",
    });
    const tool1 = await messageRepo.append({
      chatId,
      role: "tool",
      content: "t1",
      toolCallId: "call1",
    });
    const user2 = await messageRepo.append({
      chatId,
      role: "user",
      content: "u2",
    });

    await chatRunRepo.update(user0Run.id, {
      assistantMessageId: null,
    });
    const run1 = await chatRunRepo.create({
      chatId,
      userMessageId: user1.id,
      status: "failed",
      startedAt: new Date().toISOString(),
    });
    await chatRunRepo.update(run1.id, {
      assistantMessageId: assistant1.id,
    });
    await chatRunRepo.create({
      chatId,
      userMessageId: user2.id,
      status: "pending",
      startedAt: new Date().toISOString(),
    });

    await messageService.pruneAfterUserMessage(chatId, user1.id);

    const remainingMessages = await messageRepo.listForChat(chatId);
    expect(remainingMessages.map((m) => m.content)).toEqual(["u0", "u1"]);

    const remainingRuns = await chatRunRepo.listByChat(chatId);
    expect(remainingRuns.map((r) => r.userMessageId)).toEqual([user0.id]);
  });

  it("rejects pruning non-user messages", async () => {
    const assistant = await messageRepo.append({
      chatId,
      role: "assistant",
      content: "oops",
    });

    await expect(
      messageService.pruneAfterUserMessage(chatId, assistant.id),
    ).rejects.toMatchObject<AppError>({
      code: "INVALID_MESSAGE_ROLE",
    });
  });

  it("deletes assistant, its run, tool outputs, and paired user message", async () => {
    const user = await messageRepo.append({
      chatId,
      role: "user",
      content: "ask",
    });
    const run = await chatRunRepo.create({
      chatId,
      userMessageId: user.id,
      status: "running",
      startedAt: new Date().toISOString(),
    });
    const assistant = await messageRepo.append({
      chatId,
      role: "assistant",
      content: "answer",
      runId: run.id,
    });
    await chatRunRepo.update(run.id, { assistantMessageId: assistant.id });
    const tool = await messageRepo.append({
      chatId,
      role: "tool",
      content: "tool-output",
      toolCallId: "call-1",
      runId: run.id,
    });

    await messageService.deleteMessageCascade(chatId, assistant.id);

    const remainingMessages = await messageRepo.listForChat(chatId);
    expect(remainingMessages).toHaveLength(0);

    const remainingRuns = await chatRunRepo.listByChat(chatId);
    expect(remainingRuns).toHaveLength(0);
    expect(tool).toBeDefined(); // sanity to avoid unused warning
  });
});
