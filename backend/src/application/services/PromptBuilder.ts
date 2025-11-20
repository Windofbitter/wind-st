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
    await this.appendLorebooks(messages, character.id);
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
  ): Promise<void> {
    const mappings =
      await this.characterLorebookService.listForCharacter(
        characterId,
      );
    if (mappings.length === 0) return;

    const worldInfo: string[] = [];

    for (const mapping of mappings) {
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
        const content = entry.content.trim();
        if (content) {
          worldInfo.push(content);
        }
      }
    }

    if (worldInfo.length === 0) return;

    messages.push({
      role: "system",
      content: worldInfo.join("\n\n"),
    });
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
