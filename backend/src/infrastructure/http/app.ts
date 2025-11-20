import Fastify from "fastify";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";
import type { PromptBuilder } from "../../core/ports/PromptBuilder";
import { CharacterService } from "../../application/services/CharacterService";
import { ChatService } from "../../application/services/ChatService";
import { MessageService } from "../../application/services/MessageService";
import { LLMConnectionService } from "../../application/services/LLMConnectionService";
import { LorebookService } from "../../application/services/LorebookService";
import { CharacterLorebookService } from "../../application/services/CharacterLorebookService";
import { CharacterMCPServerService } from "../../application/services/CharacterMCPServerService";
import { MCPServerService } from "../../application/services/MCPServerService";
import { LLMConnectionDiagnosticsService } from "../../application/services/LLMConnectionDiagnosticsService";
import { PresetService } from "../../application/services/PresetService";
import { PromptStackService } from "../../application/services/PromptStackService";
import { ChatOrchestrator } from "../../application/orchestrators/ChatOrchestrator";
import { HistoryConfigService } from "../../application/services/HistoryConfigService";
import { DefaultPromptBuilder } from "../../application/services/PromptBuilder";
import type { MCPClient } from "../../core/ports/MCPClient";
import { openDatabase } from "../sqlite/db";
import { CharacterRepositorySqlite } from "../sqlite/CharacterRepositorySqlite";
import { ChatRepositorySqlite } from "../sqlite/ChatRepositorySqlite";
import { ChatLLMConfigRepositorySqlite } from "../sqlite/ChatLLMConfigRepositorySqlite";
import { ChatRunRepositorySqlite } from "../sqlite/ChatRunRepositorySqlite";
import { ChatHistoryConfigRepositorySqlite } from "../sqlite/ChatHistoryConfigRepositorySqlite";
import { MessageRepositorySqlite } from "../sqlite/MessageRepositorySqlite";
import { LLMConnectionRepositorySqlite } from "../sqlite/LLMConnectionRepositorySqlite";
import { LorebookRepositorySqlite } from "../sqlite/LorebookRepositorySqlite";
import { LorebookEntryRepositorySqlite } from "../sqlite/LorebookEntryRepositorySqlite";
import { CharacterLorebookRepositorySqlite } from "../sqlite/CharacterLorebookRepositorySqlite";
import { CharacterMCPServerRepositorySqlite } from "../sqlite/CharacterMCPServerRepositorySqlite";
import { MCPServerRepositorySqlite } from "../sqlite/MCPServerRepositorySqlite";
import { PresetRepositorySqlite } from "../sqlite/PresetRepositorySqlite";
import { PromptPresetRepositorySqlite } from "../sqlite/PromptPresetRepositorySqlite";
import { OpenAILLMClient } from "../llm/OpenAILLMClient";
import { OpenAIAdminClient } from "../llm/OpenAIAdminClient";
import { StdIoMCPClient } from "../mcp/StdIoMCPClient";
import { registerErrorHandler } from "./errorHandler";
import { registerHealthRoutes } from "./routes/health";
import { registerCharacterRoutes } from "./routes/characters";
import { registerChatRoutes } from "./routes/chats";
import { registerMessageRoutes } from "./routes/messages";
import { registerLorebookRoutes } from "./routes/lorebooks";
import { registerPresetRoutes } from "./routes/presets";
import { registerPromptStackRoutes } from "./routes/promptStack";
import { registerLLMConnectionRoutes } from "./routes/llmConnections";
import { registerMCPServerRoutes } from "./routes/mcpServers";
import { registerCharacterLorebookRoutes } from "./routes/characterLorebooks";
import { registerCharacterMCPServerRoutes } from "./routes/characterMcpServers";

declare module "fastify" {
  interface FastifyInstance {
    characterService: CharacterService;
    chatService: ChatService;
    messageService: MessageService;
    llmConnectionService: LLMConnectionService;
    lorebookService: LorebookService;
    characterLorebookService: CharacterLorebookService;
    characterMcpServerService: CharacterMCPServerService;
    mcpServerService: MCPServerService;
    presetService: PresetService;
    promptStackService: PromptStackService;
    chatOrchestrator: ChatOrchestrator;
    chatRunRepository: ChatRunRepository;
    llmDiagnosticsService: LLMConnectionDiagnosticsService;
    historyConfigService: HistoryConfigService;
    promptBuilder: PromptBuilder;
    mcpClient: MCPClient;
  }
}

export async function buildApp() {
  const db = openDatabase();
  const characterRepository = new CharacterRepositorySqlite(db);
  const chatRepository = new ChatRepositorySqlite(db);
  const chatConfigRepository = new ChatLLMConfigRepositorySqlite(db);
  const chatRunRepository = new ChatRunRepositorySqlite(db);
  const chatHistoryConfigRepository = new ChatHistoryConfigRepositorySqlite(
    db,
  );
  const messageRepository = new MessageRepositorySqlite(db);
  const llmConnectionRepository = new LLMConnectionRepositorySqlite(db);
  const lorebookRepository = new LorebookRepositorySqlite(db);
  const lorebookEntryRepository = new LorebookEntryRepositorySqlite(db);
  const characterLorebookRepository =
    new CharacterLorebookRepositorySqlite(db);
  const mcpServerRepository = new MCPServerRepositorySqlite(db);
  const characterMcpServerRepository =
    new CharacterMCPServerRepositorySqlite(db);
  const presetRepository = new PresetRepositorySqlite(db);
  const promptPresetRepository = new PromptPresetRepositorySqlite(db);

  const llmConnectionService = new LLMConnectionService(
    llmConnectionRepository,
  );
  const characterService = new CharacterService(characterRepository);
  const chatService = new ChatService(
    chatRepository,
    chatConfigRepository,
    llmConnectionService,
  );
  const messageService = new MessageService(messageRepository);
  const lorebookService = new LorebookService(
    lorebookRepository,
    lorebookEntryRepository,
  );
  const characterLorebookService = new CharacterLorebookService(
    characterRepository,
    lorebookRepository,
    characterLorebookRepository,
  );
  const mcpServerService = new MCPServerService(mcpServerRepository);
  const characterMcpServerService = new CharacterMCPServerService(
    characterRepository,
    mcpServerRepository,
    characterMcpServerRepository,
  );
  const mcpClient = new StdIoMCPClient();
  const historyConfigService = new HistoryConfigService(
    chatHistoryConfigRepository,
  );
  const presetService = new PresetService(presetRepository);
  const promptStackService = new PromptStackService(
    characterRepository,
    presetRepository,
    promptPresetRepository,
  );
  const llmClient = new OpenAILLMClient();
  const llmAdminClient = new OpenAIAdminClient();
  const llmDiagnosticsService = new LLMConnectionDiagnosticsService(
    llmConnectionService,
    llmAdminClient,
  );
  const promptBuilder = new DefaultPromptBuilder(
    chatService,
    characterService,
    promptStackService,
    presetService,
    lorebookService,
    characterLorebookService,
    mcpServerService,
    characterMcpServerService,
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
  );

  const app = Fastify({
    logger: true,
  });

  // Ensure we close the DB when Fastify shuts down.
  app.addHook("onClose", async () => {
    try {
      db.close();
    } catch {
      // ignore close errors
    }
  });

  app.decorate("characterService", characterService);
  app.decorate("chatService", chatService);
  app.decorate("messageService", messageService);
  app.decorate("llmConnectionService", llmConnectionService);
  app.decorate("lorebookService", lorebookService);
  app.decorate("characterLorebookService", characterLorebookService);
  app.decorate("mcpServerService", mcpServerService);
  app.decorate("characterMcpServerService", characterMcpServerService);
  app.decorate("presetService", presetService);
  app.decorate("promptStackService", promptStackService);
  app.decorate("chatOrchestrator", chatOrchestrator);
  app.decorate("chatRunRepository", chatRunRepository);
  app.decorate("llmDiagnosticsService", llmDiagnosticsService);
  app.decorate("historyConfigService", historyConfigService);
  app.decorate("promptBuilder", promptBuilder);
  app.decorate("mcpClient", mcpClient);

  registerHealthRoutes(app);
  registerCharacterRoutes(app);
  registerChatRoutes(app);
  registerMessageRoutes(app);
  registerLorebookRoutes(app);
  registerCharacterLorebookRoutes(app);
  registerPresetRoutes(app);
  registerPromptStackRoutes(app);
  registerLLMConnectionRoutes(app);
  registerMCPServerRoutes(app);
  registerCharacterMCPServerRoutes(app);
  registerErrorHandler(app);

  return app;
}
