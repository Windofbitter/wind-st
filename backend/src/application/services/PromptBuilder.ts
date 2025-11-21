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
import type { Message } from "../../core/entities/Message";
import type { TokenCounter } from "../utils/TokenCounter";
import type { UserPersonaService } from "./UserPersonaService";
import type { UserPersona } from "../../core/entities/UserPersona";
type TemplateContext = { characterName: string; userName: string };
export class DefaultPromptBuilder implements PromptBuilder {
  constructor(
    private readonly chatService: ChatService,
    private readonly characterService: CharacterService,
    private readonly userPersonaService: UserPersonaService,
    private readonly promptStackService: PromptStackService,
    private readonly presetService: PresetService,
    private readonly lorebookService: LorebookService,
    private readonly characterLorebookService: CharacterLorebookService,
    private readonly mcpServerService: MCPServerService,
    private readonly characterMcpServerService: CharacterMCPServerService,
    private readonly historyConfigService: HistoryConfigService,
    private readonly messageService: MessageService,
    private readonly tokenCounter: TokenCounter,
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
    const userPersona = await this.userPersonaService.getById(
      chat.userPersonaId,
    );
    if (!userPersona) {
      throw new AppError(
        "USER_PERSONA_NOT_FOUND",
        "User persona not found",
      );
    }
    const templateContext: TemplateContext = {
      characterName: character.name,
      userName: userPersona.name,
    };
    const historyConfig = await this.historyConfigService.getHistoryConfig(
      chatId,
    );
    const history = await this.messageService.listMessages(chatId);
    const loreScanTexts = this.collectLoreScanTexts(
      history,
      historyConfig.loreScanTokenLimit,
    );
    const messages: LLMChatMessage[] = [];
    this.appendPersona(messages, character.persona, templateContext);
    this.appendUserPersonaPrompt(messages, userPersona, templateContext);
    await this.appendPresets(messages, character.id, templateContext);
    await this.appendLorebooks(
      messages,
      character.id,
      loreScanTexts,
    );
    await this.appendHistory(messages, historyConfig, history);
    const tools = await this.buildTools(character.id);
    return { messages, tools };
  }
  private appendPersona(
    messages: LLMChatMessage[],
    persona: string,
    context: TemplateContext,
  ): void {
    const trimmed = persona?.trim();
    if (!trimmed) return;
    messages.push({
      role: "system",
      content: this.renderTemplate(trimmed, context),
    });
  }
  private appendUserPersonaPrompt(
    messages: LLMChatMessage[],
    persona: UserPersona,
    context: TemplateContext,
  ): void {
    const prompt = persona.prompt?.trim();
    if (!prompt) return;
    messages.push({
      role: "system",
      content: this.renderTemplate(prompt, context),
    });
  }
  private async appendPresets(
    messages: LLMChatMessage[],
    characterId: string,
    context: TemplateContext,
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
          content: this.renderTemplate(preset.content, context),
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
  private renderTemplate(
    template: string,
    context: TemplateContext,
  ): string {
    return template
      .replace(/\{character\}/gi, context.characterName)
      .replace(/\{user\}/gi, context.userName);
  }
  private async appendLorebooks(
    messages: LLMChatMessage[],
    characterId: string,
    loreScanTexts: string[],
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
    if (loreScanTexts.length === 0) return;
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
        if (!this.entryMatches(entry.keywords ?? [], loreScanTexts)) {
          continue;
        }
        const content = entry.content.trim();
        if (!content) continue;
        collected.push(content);
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
  private collectLoreScanTexts(
    history: Message[],
    tokenLimit: number,
  ): string[] {
    if (history.length === 0) return [];
    if (!Number.isFinite(tokenLimit) || tokenLimit <= 0) return [];
    const collected: string[] = [];
    let remaining = Math.floor(tokenLimit);
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const entry = history[i];
      if (entry.state !== "ok") continue;
      if (entry.role !== "user" && entry.role !== "assistant") continue;
      const content = entry.content?.trim();
      if (!content) continue;
      const normalized = content.toLowerCase();
      const cost = this.tokenCounter.count(normalized);
      if (cost <= 0) continue;
      if (collected.length > 0 && cost > remaining) {
        break;
      }
      collected.push(normalized);
      remaining -= cost;
      if (remaining <= 0) {
        break;
      }
    }
    return collected.reverse();
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
    historyConfig: { historyEnabled: boolean; messageLimit: number },
    history: Message[],
  ): Promise<void> {
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
