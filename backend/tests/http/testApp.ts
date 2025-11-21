import Fastify, { type FastifyInstance } from "fastify";
import { CharacterService } from "../../src/application/services/CharacterService";
import { ChatService } from "../../src/application/services/ChatService";
import { MessageService } from "../../src/application/services/MessageService";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import { LorebookService } from "../../src/application/services/LorebookService";
import { MCPServerService } from "../../src/application/services/MCPServerService";
import { PresetService } from "../../src/application/services/PresetService";
import { PromptStackService } from "../../src/application/services/PromptStackService";
import { HistoryConfigService } from "../../src/application/services/HistoryConfigService";
import { ChatOrchestrator } from "../../src/application/orchestrators/ChatOrchestrator";
import { UserPersonaService } from "../../src/application/services/UserPersonaService";
import { registerErrorHandler } from "../../src/infrastructure/http/errorHandler";
import { registerHealthRoutes } from "../../src/infrastructure/http/routes/health";
import { registerCharacterRoutes } from "../../src/infrastructure/http/routes/characters";
import { registerChatRoutes } from "../../src/infrastructure/http/routes/chats";
import { registerMessageRoutes } from "../../src/infrastructure/http/routes/messages";
import { registerLorebookRoutes } from "../../src/infrastructure/http/routes/lorebooks";
import { registerPresetRoutes } from "../../src/infrastructure/http/routes/presets";
import { registerPromptStackRoutes } from "../../src/infrastructure/http/routes/promptStack";
import { registerLLMConnectionRoutes } from "../../src/infrastructure/http/routes/llmConnections";
import { registerMCPServerRoutes } from "../../src/infrastructure/http/routes/mcpServers";
import { registerUserPersonaRoutes } from "../../src/infrastructure/http/routes/userPersonas";
import type { ChatRunRepository } from "../../src/core/ports/ChatRunRepository";
import type { LLMClient } from "../../src/core/ports/LLMClient";
import type { MCPClient } from "../../src/core/ports/MCPClient";
import type { PromptBuilder } from "../../src/core/ports/PromptBuilder";
import {
  FakeCharacterRepository,
  FakeChatRepository,
  FakeChatLLMConfigRepository,
  FakeLorebookRepository,
  FakeLorebookEntryRepository,
  FakeLLMConnectionRepository,
  FakeMCPServerRepository,
  FakeMessageRepository,
  FakePresetRepository,
  FakePromptPresetRepository,
  FakeUserPersonaRepository,
} from "../services/fakeRepositories";
import {
  FakeChatRunRepository,
  FakeLLMClient,
} from "../services/fakeOrchestration";
import { ChatEventService } from "../../src/application/services/ChatEventService";
import { registerChatEventRoutes } from "../../src/infrastructure/http/routes/chatEvents";

export interface TestAppContext {
  app: FastifyInstance;
  chatRunRepository: ChatRunRepository;
  llmClient: LLMClient;
}

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

export async function createTestApp(
  overrides: Partial<{
    llmClient: LLMClient;
    chatRunRepository: ChatRunRepository;
  }> = {},
): Promise<TestAppContext> {
  const characterRepository = new FakeCharacterRepository();
  const chatRepository = new FakeChatRepository();
  const chatConfigRepository = new FakeChatLLMConfigRepository();
  const chatRunRepository =
    overrides.chatRunRepository ?? new FakeChatRunRepository();
  const messageRepository = new FakeMessageRepository();
  const llmConnectionRepository = new FakeLLMConnectionRepository();
  const lorebookRepository = new FakeLorebookRepository();
  const lorebookEntryRepository = new FakeLorebookEntryRepository();
  const mcpServerRepository = new FakeMCPServerRepository();
  const presetRepository = new FakePresetRepository();
  const promptPresetRepository = new FakePromptPresetRepository();
  const userPersonaRepository = new FakeUserPersonaRepository();
  const historyConfigRepository = {
    async create(data: {
      chatId: string;
      historyEnabled: boolean;
      messageLimit: number;
      loreScanTokenLimit: number;
    }) {
      return data;
    },
    async getByChatId():
      Promise<{
        chatId: string;
        historyEnabled: boolean;
        messageLimit: number;
        loreScanTokenLimit: number;
      } | null> {
      return null;
    },
    async updateByChatId(
      chatId: string,
      patch: {
        historyEnabled?: boolean;
        messageLimit?: number;
        loreScanTokenLimit?: number;
      },
    ) {
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
  };

  const characterService = new CharacterService(characterRepository);
  const llmConnectionService = new LLMConnectionService(llmConnectionRepository);
  const userPersonaService = new UserPersonaService(
    userPersonaRepository,
    chatRepository,
  );
  const chatService = new ChatService(
    chatRepository,
    chatConfigRepository,
    llmConnectionService,
    userPersonaService,
  );
  const messageService = new MessageService(
    messageRepository,
    chatRunRepository,
  );
  const lorebookService = new LorebookService(
    lorebookRepository,
    lorebookEntryRepository,
  );
  const mcpServerService = new MCPServerService(mcpServerRepository);
  const presetService = new PresetService(presetRepository);
  const promptStackService = new PromptStackService(
    characterRepository,
    presetRepository,
    promptPresetRepository,
  );
  const historyConfigService = new HistoryConfigService(
    historyConfigRepository,
  );
  const chatEvents = new ChatEventService();

  const llmClient = overrides.llmClient ?? new FakeLLMClient();
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

  const chatOrchestrator = new ChatOrchestrator(
    chatService,
    messageService,
    llmConnectionService,
    chatRunRepository,
    llmClient,
    promptBuilder,
    mcpClient,
    mcpServerService,
    chatEvents,
  );

  const app = Fastify({ logger: false });

  app.decorate("characterService", characterService);
  app.decorate("chatService", chatService);
  app.decorate("userPersonaService", userPersonaService);
  app.decorate("messageService", messageService);
  app.decorate("llmConnectionService", llmConnectionService);
  app.decorate("lorebookService", lorebookService);
  app.decorate("mcpServerService", mcpServerService);
  app.decorate("presetService", presetService);
  app.decorate("promptStackService", promptStackService);
  app.decorate("chatOrchestrator", chatOrchestrator);
  app.decorate("chatRunRepository", chatRunRepository);
  app.decorate("historyConfigService", historyConfigService);
  app.decorate("promptBuilder", promptBuilder);
  app.decorate("chatEventService", chatEvents);

  registerHealthRoutes(app);
  registerCharacterRoutes(app);
  registerChatRoutes(app);
  registerUserPersonaRoutes(app);
  registerMessageRoutes(app);
  registerLorebookRoutes(app);
  registerPresetRoutes(app);
  registerPromptStackRoutes(app);
  registerLLMConnectionRoutes(app);
  registerMCPServerRoutes(app);
  registerChatEventRoutes(app);
  registerErrorHandler(app);

  return { app, chatRunRepository, llmClient };
}

