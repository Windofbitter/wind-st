import { describe, expect, it } from "vitest";
import { ChatService } from "../../src/application/services/ChatService";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import {
  FakeChatLLMConfigRepository,
  FakeChatRepository,
  FakeLLMConnectionRepository,
} from "./fakeRepositories";
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_TOOL_ITERATIONS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOOL_CALL_TIMEOUT_MS,
} from "../../src/application/config/llmDefaults";

async function createService() {
  const chatRepo = new FakeChatRepository();
  const chatConfigRepo = new FakeChatLLMConfigRepository();
  const llmConnectionRepo = new FakeLLMConnectionRepository();
  const llmConnectionService = new LLMConnectionService(llmConnectionRepo);

  const service = new ChatService(
    chatRepo,
    chatConfigRepo,
    llmConnectionService,
  );
  return {
    chatRepo,
    chatConfigRepo,
    llmConnectionRepo,
    llmConnectionService,
    service,
  };
}

describe("ChatService", () => {
  it("creates chat without initial config", async () => {
    const { service, chatConfigRepo } = await createService();

    const { chat, llmConfig } = await service.createChat({
      characterId: "char-1",
      title: "Test chat",
    });

    expect(chat.id).toBeDefined();
    expect(llmConfig).toBeNull();

    const storedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(storedConfig).toBeNull();
  });

  it("creates chat with default config when a connection exists", async () => {
    const { service, chatConfigRepo, llmConnectionRepo } =
      await createService();

    const createdConn = await llmConnectionRepo.create({
      name: "Primary",
      provider: "openai_compatible",
      baseUrl: "http://example",
      defaultModel: "gpt-4.1-mini",
      apiKey: "sk-test",
      isEnabled: true,
    });

    const { chat, llmConfig } = await service.createChat({
      characterId: "char-1",
      title: "Test chat",
    });

    expect(llmConfig).not.toBeNull();
    expect(llmConfig?.llmConnectionId).toBe(createdConn.id);
    expect(llmConfig?.model).toBe(createdConn.defaultModel);
    expect(llmConfig?.temperature).toBe(DEFAULT_TEMPERATURE);
    expect(llmConfig?.maxOutputTokens).toBe(
      DEFAULT_MAX_OUTPUT_TOKENS,
    );
    expect(llmConfig?.maxToolIterations).toBe(
      DEFAULT_MAX_TOOL_ITERATIONS,
    );
    expect(llmConfig?.toolCallTimeoutMs).toBe(
      DEFAULT_TOOL_CALL_TIMEOUT_MS,
    );

    const storedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(storedConfig?.id).toBe(llmConfig?.id);
  });

  it("creates chat with initial LLM config, wiring chatId", async () => {
    const { service, chatConfigRepo, llmConnectionRepo } =
      await createService();

    const connection = await llmConnectionRepo.create({
      name: "Primary",
      provider: "openai_compatible",
      baseUrl: "http://example",
      defaultModel: "gpt-4.1",
      apiKey: "sk-test",
      isEnabled: true,
    });

    const { chat, llmConfig } = await service.createChat(
      {
        characterId: "char-1",
        title: "With config",
      },
      {
        llmConnectionId: connection.id,
        model: "m",
        temperature: 0.5,
        maxOutputTokens: 256,
        maxToolIterations: 3,
        toolCallTimeoutMs: 15000,
      },
    );

    expect(llmConfig).not.toBeNull();
    expect(llmConfig?.chatId).toBe(chat.id);

    const storedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(storedConfig?.id).toBe(llmConfig?.id);
  });

  it("deletes chat and its config", async () => {
    const { service, chatRepo, chatConfigRepo, llmConnectionRepo } =
      await createService();

    const chat = await chatRepo.create({
      characterId: "char-1",
      title: "t",
    });
    await chatConfigRepo.create({
      chatId: chat.id,
      llmConnectionId: (await llmConnectionRepo.create({
        name: "Primary",
        provider: "openai_compatible",
        baseUrl: "http://example",
        defaultModel: "gpt-4.1",
        apiKey: "sk-test",
      })).id,
      model: "m",
      temperature: 0.2,
      maxOutputTokens: 42,
      maxToolIterations: 3,
      toolCallTimeoutMs: 15000,
    });

    await service.deleteChat(chat.id);

    const deletedChat = await chatRepo.getById(chat.id);
    expect(deletedChat).toBeNull();

    const deletedConfig = await chatConfigRepo.getByChatId(chat.id);
    expect(deletedConfig).toBeNull();
  });

  it("proxies get/list/update config operations", async () => {
    const { service, chatRepo, llmConnectionRepo } = await createService();

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
        llmConnectionId: (await llmConnectionRepo.create({
          name: "Primary",
          provider: "openai_compatible",
          baseUrl: "http://example",
          defaultModel: "gpt-4.1",
          apiKey: "sk-test",
        })).id,
        model: "m1",
        temperature: 0.1,
        maxOutputTokens: 10,
        maxToolIterations: 3,
        toolCallTimeoutMs: 15000,
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
