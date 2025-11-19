import Fastify from "fastify";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";
import { CharacterService } from "../../application/services/CharacterService";
import { ChatService } from "../../application/services/ChatService";
import { MessageService } from "../../application/services/MessageService";
import { LLMConnectionService } from "../../application/services/LLMConnectionService";
import { LorebookService } from "../../application/services/LorebookService";
import { MCPServerService } from "../../application/services/MCPServerService";
import { PresetService } from "../../application/services/PresetService";
import { PromptStackService } from "../../application/services/PromptStackService";
import { ChatOrchestrator } from "../../application/orchestrators/ChatOrchestrator";
import { openDatabase } from "../sqlite/db";
import { CharacterRepositorySqlite } from "../sqlite/CharacterRepositorySqlite";
import { ChatRepositorySqlite } from "../sqlite/ChatRepositorySqlite";
import { ChatLLMConfigRepositorySqlite } from "../sqlite/ChatLLMConfigRepositorySqlite";
import { ChatRunRepositorySqlite } from "../sqlite/ChatRunRepositorySqlite";
import { MessageRepositorySqlite } from "../sqlite/MessageRepositorySqlite";
import { LLMConnectionRepositorySqlite } from "../sqlite/LLMConnectionRepositorySqlite";
import { LorebookRepositorySqlite } from "../sqlite/LorebookRepositorySqlite";
import { LorebookEntryRepositorySqlite } from "../sqlite/LorebookEntryRepositorySqlite";
import { MCPServerRepositorySqlite } from "../sqlite/MCPServerRepositorySqlite";
import { PresetRepositorySqlite } from "../sqlite/PresetRepositorySqlite";
import { PromptPresetRepositorySqlite } from "../sqlite/PromptPresetRepositorySqlite";
import { OpenAILLMClient } from "../llm/OpenAILLMClient";
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

declare module "fastify" {
  interface FastifyInstance {
    characterService: CharacterService;
    chatService: ChatService;
    messageService: MessageService;
    llmConnectionService: LLMConnectionService;
    lorebookService: LorebookService;
    mcpServerService: MCPServerService;
    presetService: PresetService;
    promptStackService: PromptStackService;
    chatOrchestrator: ChatOrchestrator;
    chatRunRepository: ChatRunRepository;
  }
}

export async function buildApp() {
  const db = openDatabase();
  const characterRepository = new CharacterRepositorySqlite(db);
   const chatRepository = new ChatRepositorySqlite(db);
   const chatConfigRepository = new ChatLLMConfigRepositorySqlite(db);
   const chatRunRepository = new ChatRunRepositorySqlite(db);
   const messageRepository = new MessageRepositorySqlite(db);
   const llmConnectionRepository = new LLMConnectionRepositorySqlite(db);
   const lorebookRepository = new LorebookRepositorySqlite(db);
   const lorebookEntryRepository = new LorebookEntryRepositorySqlite(db);
   const mcpServerRepository = new MCPServerRepositorySqlite(db);
   const presetRepository = new PresetRepositorySqlite(db);
   const promptPresetRepository = new PromptPresetRepositorySqlite(db);

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
   const llmClient = new OpenAILLMClient();
   const chatOrchestrator = new ChatOrchestrator(
     chatService,
     messageService,
     llmConnectionService,
     chatRunRepository,
     llmClient,
   );

  const app = Fastify({
    logger: true,
  });

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

  return app;
}
