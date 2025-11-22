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
    const stack =
      await this.promptStackService.getPromptStackForCharacter(
        character.id,
      );
    const presetsById = await this.loadPresetsById(stack);
    const sortedStack = [...stack].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const enabledStack = sortedStack.filter((pp) => pp.isEnabled);
    const hasHistoryPreset = sortedStack.some((pp) => {
      const preset = presetsById.get(pp.presetId);
      return preset?.kind === "history";
    });
    const hasEnabledMcpPreset = enabledStack.some((pp) => {
      const preset = presetsById.get(pp.presetId);
      return preset?.kind === "mcp_tools";
    });
    const hasAnyMcpPreset = sortedStack.some((pp) => {
      const preset = presetsById.get(pp.presetId);
      return preset?.kind === "mcp_tools";
    });
    const messages: LLMChatMessage[] = [];
    this.appendPersona(messages, character.persona, templateContext);
    this.appendUserPersonaPrompt(messages, userPersona, templateContext);
    let historyAdded = false;
    for (const item of enabledStack) {
      const preset = presetsById.get(item.presetId);
      if (!preset) continue;
      if (preset.kind === "static_text") {
        const content = preset.content?.trim();
        if (content) {
          messages.push({
            role: item.role,
            content: this.renderTemplate(content, templateContext),
          });
        }
        continue;
      }
      if (preset.kind === "lorebook") {
        await this.appendLorebookBlock(
          messages,
          preset,
          item.role,
          loreScanTexts,
        );
        continue;
      }
      if (preset.kind === "history") {
        if (!historyAdded) {
          await this.appendHistory(
            messages,
            historyConfig,
            history,
          );
          historyAdded = true;
        }
        continue;
      }
    }

    if (!historyAdded && !hasHistoryPreset) {
      await this.appendHistory(messages, historyConfig, history);
    }

    const shouldIncludeTools = hasAnyMcpPreset
      ? hasEnabledMcpPreset
      : true;
    const tools = shouldIncludeTools
      ? await this.buildTools(character.id)
      : [];
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
  private async appendLorebookBlock(
    messages: LLMChatMessage[],
    preset: Preset,
    role: PromptPreset["role"],
    loreScanTexts: string[],
  ): Promise<void> {
    if (!Array.isArray(loreScanTexts) || loreScanTexts.length === 0) {
      return;
    }
    const config = preset.config ?? {};
    const lorebookId = (config as { lorebookId?: unknown }).lorebookId;
    if (typeof lorebookId !== "string") return;

    const entries =
      await this.lorebookService.listLorebookEntries(lorebookId);
    const enabled = entries
      .filter((e) => e.isEnabled)
      .sort((a, b) => a.insertionOrder - b.insertionOrder);

    const collected: string[] = [];
    for (const entry of enabled) {
      if (!this.entryMatches(entry.keywords ?? [], loreScanTexts)) {
        continue;
      }
      const content = entry.content.trim();
      if (!content) continue;
      collected.push(content);
    }

    if (collected.length === 0) return;
    messages.push({
      role,
      content: collected.join("\n\n"),
    });
  }
  private renderTemplate(
    template: string,
    context: TemplateContext,
  ): string {
    return template
      .replace(/\{character\}/gi, context.characterName)
      .replace(/\{user\}/gi, context.userName);
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
      if (!entry) continue;
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
