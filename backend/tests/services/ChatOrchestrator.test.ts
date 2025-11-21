import { describe, expect, it } from "vitest";
import type { LLMChatCompletionResponse, LLMClient } from "../../src/core/ports/LLMClient";
import type { PromptBuilder } from "../../src/core/ports/PromptBuilder";
import type { MCPClient } from "../../src/core/ports/MCPClient";
import { ChatOrchestrator } from "../../src/application/orchestrators/ChatOrchestrator";
import { ChatService } from "../../src/application/services/ChatService";
import { MessageService } from "../../src/application/services/MessageService";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import { HistoryConfigService } from "../../src/application/services/HistoryConfigService";
import { MCPServerService } from "../../src/application/services/MCPServerService";
import { ChatEventService } from "../../src/application/services/ChatEventService";
import { UserPersonaService } from "../../src/application/services/UserPersonaService";
import {
  FakeChatRepository,
  FakeChatLLMConfigRepository,
  FakeLLMConnectionRepository,
  FakeMessageRepository,
  FakeMCPServerRepository,
  FakeUserPersonaRepository,
} from "./fakeRepositories";
import {
  FakeChatRunRepository,
  FakeLLMClient,
} from "./fakeOrchestration";

class SimplePromptBuilder implements PromptBuilder {
  constructor(
    private readonly historyConfigService: HistoryConfigService,
    private readonly messageService: MessageService,
  ) {}

  async buildPromptForChat(chatId: string) {
    const historyConfig =
      await this.historyConfigService.getHistoryConfig(chatId);
    const history =
      await this.messageService.listMessages(chatId);

    const effectiveHistory = historyConfig.historyEnabled
      ? history.slice(-historyConfig.messageLimit)
      : history.slice(-1);

    return {
      messages: effectiveHistory.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: (m as any).toolCalls ?? undefined,
        toolCallId: (m as any).toolCallId ?? undefined,
      })),
      tools: [],
    };
  }
}

async function createEnvironment(customClient?: LLMClient) {
  const chatRepo = new FakeChatRepository();
  const chatConfigRepo = new FakeChatLLMConfigRepository();
  const messageRepo = new FakeMessageRepository();
  const llmConnectionRepo = new FakeLLMConnectionRepository();
  const mcpServerRepo = new FakeMCPServerRepository();
  const chatRunRepo = new FakeChatRunRepository();
  const userPersonaRepo = new FakeUserPersonaRepository();

  const llmConnectionService = new LLMConnectionService(llmConnectionRepo);
  const userPersonaService = new UserPersonaService(
    userPersonaRepo,
    chatRepo,
  );
  const defaultPersona = await userPersonaService.create({
    name: "You",
    isDefault: true,
  });
  const chatService = new ChatService(
    chatRepo,
    chatConfigRepo,
    llmConnectionService,
    userPersonaService,
  );
  const messageService = new MessageService(
    messageRepo,
    chatRunRepo,
  );
  const mcpServerService = new MCPServerService(mcpServerRepo);
  const chatEvents = new ChatEventService();
  const historyConfigService = new HistoryConfigService({
    async create(data) {
      return {
        chatId: data.chatId,
        historyEnabled: data.historyEnabled,
        messageLimit: data.messageLimit,
        loreScanTokenLimit: data.loreScanTokenLimit,
      };
    },
    async getByChatId() {
      return null;
    },
    async updateByChatId(chatId, patch) {
      return {
        chatId,
        historyEnabled: patch.historyEnabled ?? true,
        messageLimit: patch.messageLimit ?? 20,
        loreScanTokenLimit: patch.loreScanTokenLimit ?? 1500,
      };
    },
    async deleteByChatId() {
      // no-op
    },
  });
  const llmClient =
    customClient ?? new FakeLLMClient({
      message: { role: "assistant", content: "default-response" },
    });
  const mcpClient: MCPClient = {
    async listTools() {
      return [];
    },
    async callTool() {
      throw new Error("MCP tools not configured in tests");
    },
  };
  const promptBuilder = new SimplePromptBuilder(
    historyConfigService,
    messageService,
  );

  const orchestrator = new ChatOrchestrator(
    chatService,
    messageService,
    llmConnectionService,
    chatRunRepo,
    llmClient,
    promptBuilder,
    mcpClient,
    mcpServerService,
    chatEvents,
  );

  return {
    chatService,
    userPersonaService,
    defaultPersona,
    messageService,
    llmConnectionService,
    chatRunRepo,
    llmClient,
    mcpServerService,
    mcpClient,
    chatEvents,
    orchestrator,
  };
}

describe("ChatOrchestrator", () => {
  it("runs a turn and records ChatRun and messages", async () => {
    const llmResponse: LLMChatCompletionResponse = {
      message: { role: "assistant", content: "Hello from LLM" },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };

    const env = await createEnvironment(new FakeLLMClient(llmResponse));

    const connection = await env.llmConnectionService.createConnection({
      name: "Primary",
      provider: "openai_compatible",
      baseUrl: "http://example",
      defaultModel: "gpt-4.1",
      apiKey: "sk-orchestrator",
      isEnabled: true,
    });

    const { chat } = await env.chatService.createChat(
      {
        characterId: "char-1",
        userPersonaId: env.defaultPersona.id,
        title: "Test chat",
      },
      {
        llmConnectionId: connection.id,
        model: "gpt-4.1",
        temperature: 0.7,
        maxOutputTokens: 64,
        maxToolIterations: 2,
        toolCallTimeoutMs: 15000,
      },
    );

    const assistantMessage = await env.orchestrator.handleUserMessage(
      chat.id,
      "Hi?",
    );

    const messages = await env.messageService.listMessages(chat.id);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(assistantMessage.content).toBe("Hello from LLM");
    expect(assistantMessage.tokenCount).toBe(5);

    const runs = await env.chatRunRepo.listByChat(chat.id);
    expect(runs).toHaveLength(1);
    const run = runs[0];
    expect(run.status).toBe("completed");
    expect(run.userMessageId).toBe(messages[0].id);
    expect(run.assistantMessageId).toBe(assistantMessage.id);
    expect(run.tokenUsage).toEqual({
      prompt: 10,
      completion: 5,
      total: 15,
    });

    const llmClient = env.llmClient as FakeLLMClient;
    expect(llmClient.calls).toHaveLength(1);
    const lastUser = llmClient.calls[0].messages
      .filter((m) => m.role === "user")
      .at(-1);
    expect(lastUser?.content).toBe("Hi?");
  });

  it("rejects a second turn while a chat is busy", async () => {
    const slowClient: LLMClient = {
      async completeChat() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          message: { role: "assistant", content: "ok" },
        };
      },
    };

    const env = await createEnvironment(slowClient);

    const connection = await env.llmConnectionService.createConnection({
      name: "Primary",
      provider: "openai_compatible",
      baseUrl: "http://example",
      defaultModel: "gpt-4.1",
      isEnabled: true,
    });

    const { chat } = await env.chatService.createChat(
      {
        characterId: "char-1",
        userPersonaId: env.defaultPersona.id,
        title: "Test chat",
      },
      {
        llmConnectionId: connection.id,
        model: "gpt-4.1",
        temperature: 0.7,
        maxOutputTokens: 64,
        maxToolIterations: 2,
        toolCallTimeoutMs: 15000,
      },
    );

    const first = env.orchestrator.handleUserMessage(chat.id, "Hi");

    await expect(
      env.orchestrator.handleUserMessage(chat.id, "Again"),
    ).rejects.toThrowError("Chat is busy");

    await first;
  });
});
