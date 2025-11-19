import { describe, expect, it } from "vitest";
import { ChatService } from "../../src/application/services/ChatService";
import {
  FakeChatLLMConfigRepository,
  FakeChatRepository,
} from "./fakeRepositories";

function createService() {
  const chatRepo = new FakeChatRepository();
  const chatConfigRepo = new FakeChatLLMConfigRepository();
  const service = new ChatService(chatRepo, chatConfigRepo);
  return { chatRepo, chatConfigRepo, service };
}

describe("ChatService", () => {
  it("creates chat without initial config", async () => {
    const { service, chatConfigRepo } = createService();

    const { chat, llmConfig } = await service.createChat({
      characterId: "char-1",
      title: "Test chat",
    });

    expect(chat.id).toBeDefined();
    expect(llmConfig).toBeNull();

    const storedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(storedConfig).toBeNull();
  });

  it("creates chat with initial LLM config, wiring chatId", async () => {
    const { service, chatConfigRepo } = createService();

    const { chat, llmConfig } = await service.createChat(
      {
        characterId: "char-1",
        title: "With config",
      },
      {
        llmConnectionId: "conn-1",
        model: "m",
        temperature: 0.5,
        maxOutputTokens: 256,
      },
    );

    expect(llmConfig).not.toBeNull();
    expect(llmConfig?.chatId).toBe(chat.id);

    const storedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(storedConfig?.id).toBe(llmConfig?.id);
  });

  it("deletes chat and its config", async () => {
    const { service, chatRepo, chatConfigRepo } = createService();

    const chat = await chatRepo.create({
      characterId: "char-1",
      title: "t",
    });
    await chatConfigRepo.create({
      chatId: chat.id,
      llmConnectionId: "conn",
      model: "m",
      temperature: 0.2,
      maxOutputTokens: 42,
    });

    await service.deleteChat(chat.id);

    const deletedChat = await chatRepo.getById(chat.id);
    expect(deletedChat).toBeNull();

    const deletedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(deletedConfig).toBeNull();
  });

  it("proxies get/list/update config operations", async () => {
    const { service, chatRepo } = createService();

    const chat = await chatRepo.create({
      characterId: "char-1",
      title: "t",
    });

    const { llmConfig } = await service.createChat(
      {
        characterId: chat.characterId,
        title: chat.title,
      },
      {
        llmConnectionId: "conn",
        model: "m1",
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    );

    expect(llmConfig).not.toBeNull();

    const fetched = await service.getChatLLMConfig(llmConfig!.chatId);
    expect(fetched?.id).toBe(llmConfig!.id);

    const updated = await service.updateChatLLMConfig(llmConfig!.chatId, {
      model: "m2",
    });
    expect(updated?.model).toBe("m2");
  });
});
