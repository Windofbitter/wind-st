import type { LLMChatMessage, LLMToolCall } from "../../core/ports/LLMClient";
import type { PromptBuilder, PromptBuilderResult, PromptToolSpec } from "../../core/ports/PromptBuilder";
import { AppError } from "../errors/AppError";
import type { ChatService } from "./ChatService";
import type { CharacterService } from "./CharacterService";
import type { PromptStackService } from "./PromptStackService";
import type { PresetService } from "./PresetService";
import type { LorebookService } from "./LorebookService";
import type { CharacterLorebookService } from "./CharacterLorebookService";
import type { MCPServerService } from "./MCPServerService";
import type { CharacterMCPServerService } from "./CharacterMCPServerService";
import type { HistoryConfigService } from "./HistoryConfigService";
import type { MessageService } from "./MessageService";
import type { PromptPreset } from "../../core/entities/PromptPreset";
import type { Preset } from "../../core/entities/Preset";

export class DefaultPromptBuilder implements PromptBuilder {
  private static readonly MAX_LOREBOOK_ENTRIES = 8;
  private static readonly RECENT_MESSAGES_WINDOW = 20;

  constructor(
    private readonly chatService: ChatService,
    private readonly characterService: CharacterService,
    private readonly promptStackService: PromptStackService,
    private readonly presetService: PresetService,
    private readonly lorebookService: LorebookService,
    private readonly characterLorebookService: CharacterLorebookService,
    private readonly mcpServerService: MCPServerService,
    private readonly characterMcpServerService: CharacterMCPServerService,
    private readonly historyConfigService: HistoryConfigService,
    private readonly messageService: MessageService,
  ) {}

  async buildPromptForChat(chatId: string): Promise<PromptBuilderResult> {
    const chat = await this.chatService.getChat(chatId);
    if (!chat) {
      throw new AppError("CHAT_NOT_FOUND", "Chat not found");
    }

    const character = await this.characterService.getCharacter(
      chat.characterId,
    );
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }

    const messages: LLMChatMessage[] = [];

    this.appendPersona(messages, character.persona);
    await this.appendPresets(messages, character.id);
    await this.appendLorebooks(messages, character.id, chat.id);
    await this.appendHistory(messages, chatId);

    const tools = await this.buildTools(character.id);

    return { messages, tools };
  }

  private appendPersona(
    messages: LLMChatMessage[],
    persona: string,
  ): void {
    const trimmed = persona?.trim();
    if (!trimmed) return;

    messages.push({
      role: "system",
      content: trimmed,
    });
  }

  private async appendPresets(
    messages: LLMChatMessage[],
    characterId: string,
  ): Promise<void> {
    const stack = await this.promptStackService.getPromptStackForCharacter(
      characterId,
    );
    if (stack.length === 0) return;

    const presetsById = await this.loadPresetsById(stack);
    const sorted = [...stack].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    for (const pp of sorted) {
      const preset = presetsById.get(pp.presetId);
      if (!preset) continue;

      if (
        preset.kind === "static_text" &&
        preset.content &&
        preset.content.trim() !== ""
      ) {
        messages.push({
          role: pp.role,
          content: preset.content,
        });
      }
    }
  }

  private async loadPresetsById(
    stack: PromptPreset[],
  ): Promise<Map<string, Preset>> {
    const uniqueIds = Array.from(
      new Set(stack.map((pp) => pp.presetId)),
    );
    const presetsById = new Map<string, Preset>();

    await Promise.all(
      uniqueIds.map(async (id) => {
        const preset = await this.presetService.getPreset(id);
        if (preset) {
          presetsById.set(id, preset);
        }
      }),
    );

    return presetsById;
  }

  private async appendLorebooks(
    messages: LLMChatMessage[],
    characterId: string,
    chatId: string,
  ): Promise<void> {
    const mappings =
      await this.characterLorebookService.listForCharacter(
        characterId,
      );
    if (mappings.length === 0) return;

    const lorebookById = await this.loadLorebooksById(mappings);
    const sortedMappings = [...mappings].sort((a, b) => {
      const aLore = lorebookById.get(a.lorebookId);
      const bLore = lorebookById.get(b.lorebookId);
      const nameA = aLore?.name?.toLowerCase() ?? "";
      const nameB = bLore?.name?.toLowerCase() ?? "";
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return a.lorebookId.localeCompare(b.lorebookId);
    });

    const recentTexts = await this.getRecentMessageTexts(chatId);
    if (recentTexts.length === 0) return;

    const includedEntryIds = new Set<string>();
    const collected: string[] = [];

    for (const mapping of sortedMappings) {
      const lorebook = lorebookById.get(mapping.lorebookId);
      if (!lorebook) continue;

      const entries =
        await this.lorebookService.listLorebookEntries(
          mapping.lorebookId,
        );
      const enabled = entries
        .filter((e) => e.isEnabled)
        .sort(
          (a, b) => a.insertionOrder - b.insertionOrder,
        );

      for (const entry of enabled) {
        if (includedEntryIds.size >= DefaultPromptBuilder.MAX_LOREBOOK_ENTRIES) {
          break;
        }

        if (includedEntryIds.has(entry.id)) continue;
        if (!this.entryMatches(entry.keywords ?? [], recentTexts)) {
          continue;
        }

        const content = entry.content.trim();
        if (!content) continue;

        includedEntryIds.add(entry.id);
        collected.push(content);
      }

      if (includedEntryIds.size >= DefaultPromptBuilder.MAX_LOREBOOK_ENTRIES) {
        break;
      }
    }

    if (collected.length === 0) return;

    messages.push({
      role: "system",
      content: collected.join("\n\n"),
    });
  }

  private async loadLorebooksById(
    mappings: { lorebookId: string }[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const byId = new Map<string, { id: string; name: string }>();

    await Promise.all(
      mappings.map(async (m) => {
        if (byId.has(m.lorebookId)) return;
        const lorebook =
          await this.lorebookService.getLorebook(m.lorebookId);
        if (lorebook) {
          byId.set(lorebook.id, lorebook);
        }
      }),
    );

    return byId;
  }

  private async getRecentMessageTexts(chatId: string): Promise<string[]> {
    const history = await this.messageService.listMessages(chatId);
    if (history.length === 0) return [];

    const recent = history.slice(
      Math.max(0, history.length - DefaultPromptBuilder.RECENT_MESSAGES_WINDOW),
    );

    return recent
      .filter((m) => m.state === "ok")
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => m.content?.toLowerCase() ?? "")
      .filter((c) => c.trim() !== "");
  }

  private entryMatches(
    keywords: string[],
    texts: string[],
  ): boolean {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return false;
    }

    const normalizedKeywords = keywords
      .map((k) => k?.toLowerCase().trim())
      .filter((k): k is string => !!k);

    if (normalizedKeywords.length === 0) return false;

    for (const text of texts) {
      for (const keyword of normalizedKeywords) {
        if (keyword.length === 0) continue;
        if (text.includes(keyword)) {
          return true;
        }
      }
    }
    return false;
  }

  private async appendHistory(
    messages: LLMChatMessage[],
    chatId: string,
  ): Promise<void> {
    const historyConfig =
      await this.historyConfigService.getHistoryConfig(chatId);
    const history = await this.messageService.listMessages(chatId);

    const effectiveHistory = historyConfig.historyEnabled
      ? history.slice(-historyConfig.messageLimit)
      : history.slice(-1);

    for (const msg of effectiveHistory) {
      if (msg.state && msg.state !== "ok") {
        continue;
      }
      const llmMessage: LLMChatMessage = {
        role: msg.role,
        content: msg.content,
      };

      if (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
        llmMessage.toolCalls =
          msg.toolCalls as unknown as LLMToolCall[];
      }

      if (msg.toolCallId) {
        llmMessage.toolCallId = msg.toolCallId;
      }

      messages.push(llmMessage);
    }
  }

  private async buildTools(
    characterId: string,
  ): Promise<PromptToolSpec[]> {
    const mappings =
      await this.characterMcpServerService.listForCharacter(
        characterId,
      );
    if (mappings.length === 0) return [];

    const servers = await this.mcpServerService.listServers();
    const serversById = new Map(
      servers.map((s) => [s.id, s]),
    );

    const tools: PromptToolSpec[] = [];
    for (const mapping of mappings) {
      const server = serversById.get(mapping.mcpServerId);
      if (!server || !server.isEnabled) continue;

      tools.push({
        serverId: server.id,
        serverName: server.name,
      });
    }

    return tools;
  }
}
