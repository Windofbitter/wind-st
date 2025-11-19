import Fastify, { type FastifyInstance } from "fastify";
import { CharacterService } from "../../src/application/services/CharacterService";
import { ChatService } from "../../src/application/services/ChatService";
import { MessageService } from "../../src/application/services/MessageService";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import { LorebookService } from "../../src/application/services/LorebookService";
import { MCPServerService } from "../../src/application/services/MCPServerService";
import { PresetService } from "../../src/application/services/PresetService";
import { PromptStackService } from "../../src/application/services/PromptStackService";
import { ChatOrchestrator } from "../../src/application/orchestrators/ChatOrchestrator";
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
import type { ChatRunRepository } from "../../src/core/ports/ChatRunRepository";
import type { LLMClient } from "../../src/core/ports/LLMClient";
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
} from "../services/fakeRepositories";
import {
  FakeChatRunRepository,
  FakeLLMClient,
} from "../services/fakeOrchestration";

export interface TestAppContext {
  app: FastifyInstance;
  chatRunRepository: ChatRunRepository;
  llmClient: LLMClient;
}

export async function createTestApp(
  overrides: Partial<{
    llmClient: LLMClient;
  }> = {},
): Promise<TestAppContext> {
  const characterRepository = new FakeCharacterRepository();
  const chatRepository = new FakeChatRepository();
  const chatConfigRepository = new FakeChatLLMConfigRepository();
  const chatRunRepository = new FakeChatRunRepository();
  const messageRepository = new FakeMessageRepository();
  const llmConnectionRepository = new FakeLLMConnectionRepository();
  const lorebookRepository = new FakeLorebookRepository();
  const lorebookEntryRepository = new FakeLorebookEntryRepository();
  const mcpServerRepository = new FakeMCPServerRepository();
  const presetRepository = new FakePresetRepository();
  const promptPresetRepository = new FakePromptPresetRepository();

  const characterService = new CharacterService(characterRepository);
  const chatService = new ChatService(chatRepository, chatConfigRepository);
  const messageService = new MessageService(messageRepository);
  const llmConnectionService = new LLMConnectionService(llmConnectionRepository);
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

  const llmClient = overrides.llmClient ?? new FakeLLMClient();

  const chatOrchestrator = new ChatOrchestrator(
    chatService,
    messageService,
    llmConnectionService,
    chatRunRepository,
    llmClient,
  );

  const app = Fastify({ logger: false });

  app.decorate("characterService", characterService);
  app.decorate("chatService", chatService);
  app.decorate("messageService", messageService);
  app.decorate("llmConnectionService", llmConnectionService);
  app.decorate("lorebookService", lorebookService);
  app.decorate("mcpServerService", mcpServerService);
  app.decorate("presetService", presetService);
  app.decorate("promptStackService", promptStackService);
  app.decorate("chatOrchestrator", chatOrchestrator);
  app.decorate("chatRunRepository", chatRunRepository);

  registerHealthRoutes(app);
  registerCharacterRoutes(app);
  registerChatRoutes(app);
  registerMessageRoutes(app);
  registerLorebookRoutes(app);
  registerPresetRoutes(app);
  registerPromptStackRoutes(app);
  registerLLMConnectionRoutes(app);
  registerMCPServerRoutes(app);
  registerErrorHandler(app);

  return { app, chatRunRepository, llmClient };
}

