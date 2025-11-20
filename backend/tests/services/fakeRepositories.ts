import type { Character } from "../../src/core/entities/Character";
import type { Chat } from "../../src/core/entities/Chat";
import type { ChatLLMConfig } from "../../src/core/entities/ChatLLMConfig";
import type { Lorebook } from "../../src/core/entities/Lorebook";
import type { LorebookEntry } from "../../src/core/entities/LorebookEntry";
import type { LLMConnection } from "../../src/core/entities/LLMConnection";
import type { MCPServer } from "../../src/core/entities/MCPServer";
import type { Message } from "../../src/core/entities/Message";
import type { Preset } from "../../src/core/entities/Preset";
import type { PromptPreset } from "../../src/core/entities/PromptPreset";
import type {
  CharacterFilter,
  CharacterRepository,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../../src/core/ports/CharacterRepository";
import type {
  ChatFilter,
  ChatRepository,
  CreateChatInput,
  UpdateChatInput,
} from "../../src/core/ports/ChatRepository";
import type {
  ChatLLMConfigRepository,
  CreateChatLLMConfigInput,
  UpdateChatLLMConfigInput,
} from "../../src/core/ports/ChatLLMConfigRepository";
import type {
  CreateLorebookEntryInput,
  LorebookEntryRepository,
  UpdateLorebookEntryInput,
} from "../../src/core/ports/LorebookEntryRepository";
import type {
  CreateLorebookInput,
  LorebookFilter,
  LorebookRepository,
  UpdateLorebookInput,
} from "../../src/core/ports/LorebookRepository";
import type {
  CreateLLMConnectionInput,
  LLMConnectionRepository,
  UpdateLLMConnectionInput,
} from "../../src/core/ports/LLMConnectionRepository";
import type {
  CreateMCPServerInput,
  MCPServerRepository,
  UpdateMCPServerInput,
} from "../../src/core/ports/MCPServerRepository";
import type {
  CreateMessageInput,
  ListMessagesOptions,
  MessageRepository,
} from "../../src/core/ports/MessageRepository";
import type {
  CreatePresetInput,
  PresetFilter,
  PresetRepository,
  UpdatePresetInput,
} from "../../src/core/ports/PresetRepository";
import type {
  CreatePromptPresetInput,
  PromptPresetRepository,
  UpdatePromptPresetInput,
} from "../../src/core/ports/PromptPresetRepository";
import {
  DEFAULT_MAX_TOOL_ITERATIONS,
  DEFAULT_TOOL_CALL_TIMEOUT_MS,
} from "../../src/application/config/llmDefaults";

let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export class FakeCharacterRepository implements CharacterRepository {
  private items = new Map<string, Character>();

  async create(data: CreateCharacterInput): Promise<Character> {
    const id = nextId("char");
    const character: Character = {
      id,
      name: data.name,
      description: data.description,
      persona: data.persona,
      avatarPath: data.avatarPath,
      creatorNotes: data.creatorNotes ?? null,
    };
    this.items.set(id, character);
    return character;
  }

  async getById(id: string): Promise<Character | null> {
    return this.items.get(id) ?? null;
  }

  async list(filter?: CharacterFilter): Promise<Character[]> {
    let all = Array.from(this.items.values());
    if (filter?.nameContains) {
      all = all.filter((c) => c.name.includes(filter.nameContains as string));
    }
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  async update(
    id: string,
    patch: UpdateCharacterInput,
  ): Promise<Character | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Character = {
      ...existing,
      ...patch,
      creatorNotes:
        patch.creatorNotes !== undefined ? patch.creatorNotes : existing.creatorNotes,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeChatRepository implements ChatRepository {
  private items = new Map<string, Chat>();

  async create(data: CreateChatInput): Promise<Chat> {
    const id = nextId("chat");
    const now = new Date().toISOString();
    const chat: Chat = {
      id,
      characterId: data.characterId,
      title: data.title,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(id, chat);
    return chat;
  }

  async getById(id: string): Promise<Chat | null> {
    return this.items.get(id) ?? null;
  }

  async list(filter?: ChatFilter): Promise<Chat[]> {
    let all = Array.from(this.items.values());
    if (filter?.characterId) {
      all = all.filter((c) => c.characterId === filter.characterId);
    }
    return all;
  }

  async update(id: string, patch: UpdateChatInput): Promise<Chat | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Chat = {
      ...existing,
      ...patch,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeChatLLMConfigRepository implements ChatLLMConfigRepository {
  private items = new Map<string, ChatLLMConfig>();

  async create(data: CreateChatLLMConfigInput): Promise<ChatLLMConfig> {
    const id = nextId("cfg");
    const config: ChatLLMConfig = {
      id,
      chatId: data.chatId,
      llmConnectionId: data.llmConnectionId,
      model: data.model,
      temperature: data.temperature,
      maxOutputTokens: data.maxOutputTokens,
      maxToolIterations: data.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS,
      toolCallTimeoutMs: data.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
    };
    this.items.set(data.chatId, config);
    return config;
  }

  async getByChatId(chatId: string): Promise<ChatLLMConfig | null> {
    return this.items.get(chatId) ?? null;
  }

  async updateByChatId(
    chatId: string,
    patch: UpdateChatLLMConfigInput,
  ): Promise<ChatLLMConfig | null> {
    const existing = this.items.get(chatId);
    if (!existing) return null;
    const updated: ChatLLMConfig = {
      ...existing,
      ...patch,
    };
    this.items.set(chatId, updated);
    return updated;
  }

  async deleteByChatId(chatId: string): Promise<void> {
    this.items.delete(chatId);
  }
}

export class FakeLorebookRepository implements LorebookRepository {
  private items = new Map<string, Lorebook>();

  async create(data: CreateLorebookInput): Promise<Lorebook> {
    const id = nextId("lb");
    const lorebook: Lorebook = {
      id,
      name: data.name,
      description: data.description,
    };
    this.items.set(id, lorebook);
    return lorebook;
  }

  async getById(id: string): Promise<Lorebook | null> {
    return this.items.get(id) ?? null;
  }

  async list(filter?: LorebookFilter): Promise<Lorebook[]> {
    let all = Array.from(this.items.values());
    if (filter?.nameContains) {
      all = all.filter((l) => l.name.includes(filter.nameContains as string));
    }
    return all;
  }

  async update(
    id: string,
    patch: UpdateLorebookInput,
  ): Promise<Lorebook | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Lorebook = {
      ...existing,
      ...patch,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeLorebookEntryRepository implements LorebookEntryRepository {
  private items = new Map<string, LorebookEntry>();

  setAll(entries: LorebookEntry[]): void {
    this.items.clear();
    for (const entry of entries) {
      this.items.set(entry.id, entry);
    }
  }

  async create(data: CreateLorebookEntryInput): Promise<LorebookEntry> {
    const id = nextId("lbe");
    const entry: LorebookEntry = {
      id,
      lorebookId: data.lorebookId,
      keywords: data.keywords,
      content: data.content,
      insertionOrder: data.insertionOrder,
      isEnabled: data.isEnabled ?? true,
    };
    this.items.set(id, entry);
    return entry;
  }

  async getById(id: string): Promise<LorebookEntry | null> {
    return this.items.get(id) ?? null;
  }

  async listByLorebook(lorebookId: string): Promise<LorebookEntry[]> {
    return Array.from(this.items.values()).filter(
      (e) => e.lorebookId === lorebookId,
    );
  }

  async update(
    id: string,
    patch: UpdateLorebookEntryInput,
  ): Promise<LorebookEntry | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: LorebookEntry = {
      ...existing,
      ...patch,
      isEnabled:
        patch.isEnabled !== undefined ? patch.isEnabled : existing.isEnabled,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeLLMConnectionRepository implements LLMConnectionRepository {
  private items = new Map<string, LLMConnection>();

  async create(data: CreateLLMConnectionInput): Promise<LLMConnection> {
    const id = nextId("llm");
    const connection: LLMConnection = {
      id,
      name: data.name,
      provider: data.provider,
      baseUrl: data.baseUrl,
      defaultModel: data.defaultModel,
      apiKey: data.apiKey,
      isEnabled: data.isEnabled ?? true,
      status: data.status ?? "unknown",
      lastTestedAt: data.lastTestedAt ?? null,
      modelsAvailable: data.modelsAvailable ?? null,
    };
    this.items.set(id, connection);
    return connection;
  }

  async getById(id: string): Promise<LLMConnection | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<LLMConnection[]> {
    return Array.from(this.items.values());
  }

  async update(
    id: string,
    patch: UpdateLLMConnectionInput,
  ): Promise<LLMConnection | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: LLMConnection = {
      ...existing,
      ...patch,
      apiKey: patch.apiKey !== undefined ? patch.apiKey : existing.apiKey,
      isEnabled:
        patch.isEnabled !== undefined ? patch.isEnabled : existing.isEnabled,
      status: patch.status ?? existing.status,
      lastTestedAt:
        patch.lastTestedAt !== undefined
          ? patch.lastTestedAt
          : existing.lastTestedAt,
      modelsAvailable:
        patch.modelsAvailable !== undefined
          ? patch.modelsAvailable
          : existing.modelsAvailable,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeMCPServerRepository implements MCPServerRepository {
  private items = new Map<string, MCPServer>();

  async create(data: CreateMCPServerInput): Promise<MCPServer> {
    const id = nextId("mcp");
    const server: MCPServer = {
      id,
      name: data.name,
      command: data.command,
      args: data.args,
      env: data.env,
      isEnabled: data.isEnabled ?? true,
      status: data.status ?? "unknown",
      lastCheckedAt: data.lastCheckedAt ?? null,
      toolCount: data.toolCount ?? null,
    };
    this.items.set(id, server);
    return server;
  }

  async getById(id: string): Promise<MCPServer | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<MCPServer[]> {
    return Array.from(this.items.values());
  }

  async update(
    id: string,
    patch: UpdateMCPServerInput,
  ): Promise<MCPServer | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: MCPServer = {
      ...existing,
      ...patch,
      env: patch.env ?? existing.env,
      args: patch.args ?? existing.args,
      isEnabled:
        patch.isEnabled !== undefined ? patch.isEnabled : existing.isEnabled,
      status: patch.status ?? existing.status,
      lastCheckedAt:
        patch.lastCheckedAt !== undefined
          ? patch.lastCheckedAt
          : existing.lastCheckedAt,
      toolCount:
        patch.toolCount !== undefined ? patch.toolCount : existing.toolCount,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakeMessageRepository implements MessageRepository {
  private items: Message[] = [];

  async append(data: CreateMessageInput): Promise<Message> {
    const message: Message = {
      id: nextId("msg"),
      chatId: data.chatId,
      role: data.role,
      content: data.content,
      toolCallId: data.toolCallId ?? null,
      toolCalls: data.toolCalls ?? null,
      toolResults: data.toolResults ?? null,
      tokenCount: data.tokenCount ?? null,
      runId: data.runId ?? null,
      state: data.state ?? "ok",
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    this.items.push(message);
    return message;
  }

  async listForChat(
    chatId: string,
    options?: ListMessagesOptions,
  ): Promise<Message[]> {
    let filtered = this.items
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? filtered.length;
    return filtered.slice(offset, offset + limit);
  }

  async deleteMany(ids: string[]): Promise<void> {
    const toDelete = new Set(ids);
    this.items = this.items.filter((m) => !toDelete.has(m.id));
  }
}

export class FakePresetRepository implements PresetRepository {
  private items = new Map<string, Preset>();

  async create(data: CreatePresetInput): Promise<Preset> {
    const id = nextId("preset");
    const preset: Preset = {
      id,
      title: data.title,
      description: data.description,
      kind: data.kind,
      content: data.content ?? null,
      builtIn: data.builtIn ?? false,
      config: data.config ?? null,
    };
    this.items.set(id, preset);
    return preset;
  }

  async getById(id: string): Promise<Preset | null> {
    return this.items.get(id) ?? null;
  }

  async list(filter?: PresetFilter): Promise<Preset[]> {
    let all = Array.from(this.items.values());
    if (filter?.kind) {
      all = all.filter((p) => p.kind === filter.kind);
    }
    if (filter?.builtIn !== undefined) {
      all = all.filter((p) => p.builtIn === filter.builtIn);
    }
    if (filter?.titleContains) {
      all = all.filter((p) => p.title.includes(filter.titleContains as string));
    }
    return all;
  }

  async update(id: string, patch: UpdatePresetInput): Promise<Preset | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Preset = {
      ...existing,
      ...patch,
      content: patch.content !== undefined ? patch.content : existing.content,
      config: patch.config !== undefined ? patch.config : existing.config,
      builtIn:
        patch.builtIn !== undefined ? patch.builtIn : existing.builtIn,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class FakePromptPresetRepository implements PromptPresetRepository {
  private items = new Map<string, PromptPreset>();

  async create(data: CreatePromptPresetInput): Promise<PromptPreset> {
    const id = nextId("pp");
    const preset: PromptPreset = {
      id,
      characterId: data.characterId,
      presetId: data.presetId,
      role: data.role,
      sortOrder: data.sortOrder,
    };
    this.items.set(id, preset);
    return preset;
  }

  async getById(id: string): Promise<PromptPreset | null> {
    return this.items.get(id) ?? null;
  }

  async listByCharacter(characterId: string): Promise<PromptPreset[]> {
    return Array.from(this.items.values())
      .filter((p) => p.characterId === characterId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async update(
    id: string,
    patch: UpdatePromptPresetInput,
  ): Promise<PromptPreset | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: PromptPreset = {
      ...existing,
      ...patch,
      sortOrder:
        patch.sortOrder !== undefined ? patch.sortOrder : existing.sortOrder,
    };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
