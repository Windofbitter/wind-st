import { describe, expect, it } from "vitest";
import { DefaultPromptBuilder } from "../../src/application/services/PromptBuilder";
import { CharacterService } from "../../src/application/services/CharacterService";
import { ChatService } from "../../src/application/services/ChatService";
import { PromptStackService } from "../../src/application/services/PromptStackService";
import { PresetService } from "../../src/application/services/PresetService";
import { LorebookService } from "../../src/application/services/LorebookService";
import { CharacterLorebookService } from "../../src/application/services/CharacterLorebookService";
import { MCPServerService } from "../../src/application/services/MCPServerService";
import { CharacterMCPServerService } from "../../src/application/services/CharacterMCPServerService";
import { HistoryConfigService } from "../../src/application/services/HistoryConfigService";
import { MessageService } from "../../src/application/services/MessageService";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import { UserPersonaService } from "../../src/application/services/UserPersonaService";
import { createApproxTokenCounter } from "../../src/application/utils/TokenCounter";
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
} from "./fakeRepositories";
import { FakeChatRunRepository } from "./fakeOrchestration";

class InMemoryHistoryConfigRepository {
  constructor() {
    this.items = new Map();
  }

  async create(data) {
    const record = {
      ...data,
      loreScanTokenLimit: data.loreScanTokenLimit ?? 1500,
    };
    this.items.set(data.chatId, record);
    return record;
  }

  async getByChatId(chatId) {
    return this.items.get(chatId) ?? null;
  }

  async updateByChatId(chatId, patch) {
    const existing = this.items.get(chatId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
    };
    this.items.set(chatId, updated);
    return updated;
  }

  async deleteByChatId(chatId) {
    this.items.delete(chatId);
  }
}

class InMemoryCharacterLorebookRepository {
  constructor() {
    this.items = new Map();
    this.nextId = 1;
  }

  genId() {
    const id = `cl-${this.nextId}`;
    this.nextId += 1;
    return id;
  }

  async create(data) {
    const id = this.genId();
    const mapping = {
      id,
      characterId: data.characterId,
      lorebookId: data.lorebookId,
    };
    this.items.set(id, mapping);
    return mapping;
  }

  async getById(id) {
    return this.items.get(id) ?? null;
  }

  async listByCharacter(characterId) {
    return Array.from(this.items.values()).filter(
      (m) => m.characterId === characterId,
    );
  }

  async delete(id) {
    this.items.delete(id);
  }
}

class InMemoryCharacterMCPServerRepository {
  constructor() {
    this.items = new Map();
    this.nextId = 1;
  }

  genId() {
    const id = `cm-${this.nextId}`;
    this.nextId += 1;
    return id;
  }

  async create(data) {
    const id = this.genId();
    const mapping = {
      id,
      characterId: data.characterId,
      mcpServerId: data.mcpServerId,
    };
    this.items.set(id, mapping);
    return mapping;
  }

  async getById(id) {
    return this.items.get(id) ?? null;
  }

  async listByCharacter(characterId) {
    return Array.from(this.items.values()).filter(
      (m) => m.characterId === characterId,
    );
  }

  async delete(id) {
    this.items.delete(id);
  }
}

async function createEnvironment() {
  const characterRepo = new FakeCharacterRepository();
  const chatRepo = new FakeChatRepository();
  const chatConfigRepo = new FakeChatLLMConfigRepository();
  const lorebookRepo = new FakeLorebookRepository();
  const lorebookEntryRepo = new FakeLorebookEntryRepository();
  const llmConnectionRepo = new FakeLLMConnectionRepository();
  const mcpServerRepo = new FakeMCPServerRepository();
  const messageRepo = new FakeMessageRepository();
  const chatRunRepo = new FakeChatRunRepository();
  const presetRepo = new FakePresetRepository();
  const promptPresetRepo = new FakePromptPresetRepository();
  const userPersonaRepo = new FakeUserPersonaRepository();
  const historyConfigRepo = new InMemoryHistoryConfigRepository();
  const characterLorebookRepo =
    new InMemoryCharacterLorebookRepository();
  const characterMcpServerRepo =
    new InMemoryCharacterMCPServerRepository();

  const characterService = new CharacterService(characterRepo);
  const llmConnectionService = new LLMConnectionService(llmConnectionRepo);
  const userPersonaService = new UserPersonaService(
    userPersonaRepo,
    chatRepo,
  );
  const chatService = new ChatService(
    chatRepo,
    chatConfigRepo,
    llmConnectionService,
    userPersonaService,
  );
  const promptStackService = new PromptStackService(
    characterRepo,
    presetRepo,
    promptPresetRepo,
    lorebookRepo,
    characterLorebookRepo,
  );
  const presetService = new PresetService(presetRepo);
  const lorebookService = new LorebookService(
    lorebookRepo,
    lorebookEntryRepo,
  );
  const defaultPersona = await userPersonaService.create({
    name: "You",
    isDefault: true,
  });
  const characterLorebookService = new CharacterLorebookService(
    characterRepo,
    lorebookRepo,
    characterLorebookRepo,
  );
  const mcpServerService = new MCPServerService(mcpServerRepo);
  const characterMcpServerService = new CharacterMCPServerService(
    characterRepo,
    mcpServerRepo,
    characterMcpServerRepo,
  );
  const historyConfigService = new HistoryConfigService(
    historyConfigRepo,
  );
  const messageService = new MessageService(
    messageRepo,
    chatRunRepo,
  );
  const tokenCounter = createApproxTokenCounter();

  const promptBuilder = new DefaultPromptBuilder(
    chatService,
    characterService,
    userPersonaService,
    promptStackService,
    presetService,
    lorebookService,
    characterLorebookService,
    mcpServerService,
    characterMcpServerService,
    historyConfigService,
    messageService,
    tokenCounter,
  );

  return {
    characterService,
    chatService,
    userPersonaService,
    defaultPersona,
    defaultPersonaId: defaultPersona.id,
    promptStackService,
    presetService,
    lorebookService,
    lorebookEntryRepo,
    characterLorebookService,
    mcpServerService,
    characterMcpServerService,
    historyConfigService,
    messageService,
    promptBuilder,
  };
}

describe("DefaultPromptBuilder", () => {
  it("builds messages with persona and static_text presets in order", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      promptStackService,
      presetService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "Persona",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      title: "Chat",
    });

    const preset1 = await presetService.createPreset({
      title: "P1",
      description: "",
      kind: "static_text",
      content: "Content 1",
      builtIn: false,
    });
    const preset2 = await presetService.createPreset({
      title: "P2",
      description: "",
      kind: "static_text",
      content: "Content 2",
      builtIn: false,
    });

    await promptStackService.attachPresetToCharacter(
      character.id,
      {
        presetId: preset1.id,
        role: "system",
      },
    );
    await promptStackService.attachPresetToCharacter(
      character.id,
      {
        presetId: preset2.id,
        role: "assistant",
      },
    );

    const result = await promptBuilder.buildPromptForChat(chat.id);

    expect(result.messages.map((m) => m.content)).toEqual([
      "Persona",
      "Content 1",
      "Content 2",
    ]);
    expect(result.messages.map((m) => m.role)).toEqual([
      "system",
      "system",
      "assistant",
    ]);
  });

  it("replaces {character} and {user} placeholders in persona and presets", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      promptStackService,
      presetService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Hero",
      description: "desc",
      persona: "I am {character}",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const preset = await presetService.createPreset({
      title: "Greeting",
      description: "",
      kind: "static_text",
      content: "Hello {user} from {character}",
      builtIn: false,
    });

    await promptStackService.attachPresetToCharacter(
      character.id,
      {
        presetId: preset.id,
        role: "system",
      },
    );

    const result = await promptBuilder.buildPromptForChat(chat.id);
    expect(result.messages.map((m) => m.content)).toEqual([
      "I am Hero",
      "Hello You from Hero",
    ]);
  });

  it("includes lorebook entries in insertion order as a system message", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      lorebookService,
      characterLorebookService,
      messageService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const lorebook = await lorebookService.createLorebook({
      name: "World",
      description: "",
    });

    await characterLorebookService.attachLorebook(
      character.id,
      lorebook.id,
    );

    await lorebookService.createLorebookEntry(lorebook.id, {
      keywords: ["b"],
      content: "First",
      insertionOrder: 1,
      isEnabled: true,
    });
    await lorebookService.createLorebookEntry(lorebook.id, {
      keywords: ["a"],
      content: "Second",
      insertionOrder: 2,
      isEnabled: true,
    });

    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "b stuff then a stuff",
    });

    const result = await promptBuilder.buildPromptForChat(chat.id);
    expect(result.messages).toHaveLength(1);
    const msg = result.messages[0];
    expect(msg.role).toBe("system");
    expect(msg.content).toBe("First\n\nSecond");
  });

  it("skips lore entries when no keywords match recent messages", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      lorebookService,
      characterLorebookService,
      messageService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const lorebook = await lorebookService.createLorebook({
      name: "World",
      description: "",
    });

    await characterLorebookService.attachLorebook(
      character.id,
      lorebook.id,
    );

    await lorebookService.createLorebookEntry(lorebook.id, {
      keywords: ["dragon"],
      content: "Lore that should not appear",
      insertionOrder: 1,
      isEnabled: true,
    });

    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "hello there",
    });

    const result = await promptBuilder.buildPromptForChat(chat.id);
    const contents = result.messages.map((m) => m.content);
    expect(contents).not.toContain("Lore that should not appear");
  });

  it("caps injected lore entries and preserves insertion order", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      lorebookService,
      characterLorebookService,
      messageService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const lorebook = await lorebookService.createLorebook({
      name: "World",
      description: "",
    });

    await characterLorebookService.attachLorebook(
      character.id,
      lorebook.id,
    );

    for (let i = 0; i < 10; i += 1) {
      await lorebookService.createLorebookEntry(lorebook.id, {
        keywords: ["key"],
        content: `Content ${i}`,
        insertionOrder: i + 1,
        isEnabled: true,
      });
    }

    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "mention key to trigger all",
    });

    const result = await promptBuilder.buildPromptForChat(chat.id);
    const systemMsg = result.messages.find((m) => m.role === "system");
    expect(systemMsg).toBeDefined();
    const parts = systemMsg.content.split("\n\n");
    expect(parts).toHaveLength(8); // capped
    expect(parts[0]).toBe("Content 0");
    expect(parts[7]).toBe("Content 7");
    expect(systemMsg.content).not.toContain("Content 8");
  });

  it("ignores lore matches that only appear outside the recent history window", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      lorebookService,
      characterLorebookService,
      messageService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const lorebook = await lorebookService.createLorebook({
      name: "World",
      description: "",
    });

    await characterLorebookService.attachLorebook(
      character.id,
      lorebook.id,
    );

    await lorebookService.createLorebookEntry(lorebook.id, {
      keywords: ["ancient"],
      content: "Old lore",
      insertionOrder: 1,
      isEnabled: true,
    });

    // Add 21 messages so the first one falls outside the 20-message window.
    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "ancient keyword here",
    });

    for (let i = 0; i < 21; i += 1) {
      await messageService.appendMessage({
        chatId: chat.id,
        role: "assistant",
        content: `noise ${i}`,
      });
    }

    const result = await promptBuilder.buildPromptForChat(chat.id);
    const contents = result.messages.map((m) => m.content);
    expect(contents).not.toContain("Old lore");
  });

  it("applies history config when slicing messages", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      historyConfigService,
      messageService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    await historyConfigService.updateHistoryConfig(chat.id, {
      historyEnabled: true,
      messageLimit: 2,
    });

    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "m1",
    });
    await messageService.appendMessage({
      chatId: chat.id,
      role: "assistant",
      content: "m2",
    });
    await messageService.appendMessage({
      chatId: chat.id,
      role: "user",
      content: "m3",
    });

    const result = await promptBuilder.buildPromptForChat(chat.id);

    expect(result.messages.map((m) => m.content)).toEqual([
      "m2",
      "m3",
    ]);
  });

  it("includes only enabled MCP servers as tools", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      mcpServerService,
      characterMcpServerService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const server1 = await mcpServerService.registerServer({
      name: "Enabled",
      command: "cmd",
      args: [],
      env: {},
      isEnabled: true,
    });
    const server2 = await mcpServerService.registerServer({
      name: "Disabled",
      command: "cmd",
      args: [],
      env: {},
      isEnabled: false,
    });

    await characterMcpServerService.attachServer(
      character.id,
      server1.id,
    );
    await characterMcpServerService.attachServer(
      character.id,
      server2.id,
    );

    const result = await promptBuilder.buildPromptForChat(chat.id);
    expect(result.tools).toEqual([
      {
        serverId: server1.id,
        serverName: server1.name,
      },
    ]);
  });

  it("omits disabled stack items from the prompt", async () => {
    const {
      characterService,
      chatService,
      defaultPersonaId,
      promptStackService,
      presetService,
      promptBuilder,
    } = await createEnvironment();

    const character = await characterService.createCharacter({
      name: "Test",
      description: "desc",
      persona: "Persona",
      avatarPath: "",
      creatorNotes: null,
    });

    const { chat } = await chatService.createChat({
      characterId: character.id,
      userPersonaId: defaultPersonaId,
      title: "Chat",
    });

    const preset = await presetService.createPreset({
      title: "Block",
      description: "",
      kind: "static_text",
      content: "Enabled block",
      builtIn: false,
    });

    const stackItem = await promptStackService.attachPresetToCharacter(
      character.id,
      {
        presetId: preset.id,
        role: "system",
      },
    );

    await promptStackService.setPromptPresetEnabled(
      stackItem.id,
      false,
    );

    const result = await promptBuilder.buildPromptForChat(chat.id);
    expect(result.messages.map((m) => m.content)).toEqual([
      "Persona",
    ]);
  });
});
