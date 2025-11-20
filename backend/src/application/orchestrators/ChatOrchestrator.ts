import type { Message } from "../../core/entities/Message";
import type { ChatRun } from "../../core/entities/ChatRun";
import type { ChatRunRepository } from "../../core/ports/ChatRunRepository";
import type {
  LLMChatCompletionUsage,
  LLMChatMessage,
  LLMClient,
  LLMToolCall,
  LLMToolDefinition,
} from "../../core/ports/LLMClient";
import type { PromptBuilder, PromptToolSpec } from "../../core/ports/PromptBuilder";
import type { MCPClient } from "../../core/ports/MCPClient";
import type { MCPServer } from "../../core/entities/MCPServer";
import { ChatService } from "../services/ChatService";
import { MessageService } from "../services/MessageService";
import { LLMConnectionService } from "../services/LLMConnectionService";
import { MCPServerService } from "../services/MCPServerService";
import { AppError } from "../errors/AppError";
import {
  DEFAULT_MAX_TOOL_ITERATIONS,
  DEFAULT_TOOL_CALL_TIMEOUT_MS,
} from "../config/llmDefaults";

function nowIso(): string {
  return new Date().toISOString();
}

interface UsageTotals {
  prompt: number;
  completion: number;
  total: number;
}

interface ResolvedTool {
  definition: LLMToolDefinition;
  originalName: string;
  server: MCPServer;
}

export class ChatOrchestrator {
  private readonly locks = new Set<string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly llmConnectionService: LLMConnectionService,
    private readonly chatRunRepo: ChatRunRepository,
    private readonly llmClient: LLMClient,
    private readonly promptBuilder: PromptBuilder,
    private readonly mcpClient: MCPClient,
    private readonly mcpServerService: MCPServerService,
  ) {}

  async handleUserMessage(
    chatId: string,
    userContent: string,
  ): Promise<Message> {
    if (this.locks.has(chatId)) {
      throw new AppError("CHAT_BUSY", "Chat is busy");
    }

    this.locks.add(chatId);

    try {
      const userMessage = await this.messageService.appendMessage({
        chatId,
        role: "user",
        content: userContent,
      });

      const run = await this.createRun(chatId, userMessage.id);

      try {
        return await this.performTurn(chatId, run);
      } catch (err) {
        const finishedAt = nowIso();
        await this.chatRunRepo.update(run.id, {
          status: "failed",
          finishedAt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    } finally {
      this.locks.delete(chatId);
    }
  }

  private async createRun(chatId: string, userMessageId: string): Promise<ChatRun> {
    const startedAt = nowIso();
    return this.chatRunRepo.create({
      chatId,
      userMessageId,
      status: "running",
      startedAt,
    });
  }

  private async performTurn(
    chatId: string,
    run: ChatRun,
  ): Promise<Message> {
    const config = await this.chatService.getChatLLMConfig(chatId);
    if (!config) {
      throw new AppError(
        "CHAT_LLM_CONFIG_NOT_FOUND",
        "Chat LLM config not found",
      );
    }

    const connection = await this.llmConnectionService.getConnection(
      config.llmConnectionId,
    );
    if (!connection) {
      throw new AppError(
        "LLM_CONNECTION_NOT_FOUND",
        "LLM connection not found",
      );
    }
    if (!connection.isEnabled) {
      throw new AppError(
        "LLM_CONNECTION_DISABLED",
        "LLM connection is disabled",
      );
    }

    const prompt = await this.promptBuilder.buildPromptForChat(chatId);
    const resolvedTools = await this.resolveTools(prompt.tools ?? []);
    const toolDefinitions = resolvedTools.map((t) => t.definition);
    const toolMap = new Map(resolvedTools.map((t) => [t.definition.name, t]));

    const conversation: LLMChatMessage[] = [...prompt.messages];
    const usageTotals: UsageTotals = { prompt: 0, completion: 0, total: 0 };
    const maxToolIterations = Math.max(
      0,
      config.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS,
    );
    const toolCallTimeoutMs =
      config.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS;

    let latestAssistant: Message | null = null;

    for (let iteration = 0; iteration <= maxToolIterations; iteration++) {
      const llmMessages = [...conversation];

      const completion = await this.llmClient.completeChat({
        connection,
        model: config.model,
        messages: llmMessages,
        tools: toolDefinitions,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
      });

      this.accumulateUsage(usageTotals, completion.usage);

      latestAssistant = await this.messageService.appendMessage({
        chatId,
        role: "assistant",
        content: completion.message.content,
        toolCalls: completion.message.toolCalls ?? null,
        tokenCount: completion.usage?.completionTokens ?? null,
      });

      const assistantMessage: LLMChatMessage = {
        role: "assistant",
        content: completion.message.content,
      };
      if (completion.message.toolCalls && completion.message.toolCalls.length > 0) {
        assistantMessage.toolCalls = completion.message.toolCalls;
      }

      conversation.push(assistantMessage);

      const toolCalls = completion.message.toolCalls ?? [];
      if (toolCalls.length === 0) {
        await this.finishRunSuccess(run, latestAssistant.id, usageTotals);
        return latestAssistant;
      }

      if (iteration >= maxToolIterations) {
        throw new AppError(
          "TOOL_ITERATION_LIMIT",
          `Exceeded max tool iterations (${maxToolIterations})`,
        );
      }

      const toolMessages = await this.handleToolCalls(
        chatId,
        toolCalls,
        toolMap,
        toolCallTimeoutMs,
      );

      conversation.push(...toolMessages);
    }

    throw new AppError("TOOL_ITERATION_LIMIT", "Exceeded max tool iterations");
  }

  private async resolveTools(
    toolSpecs: PromptToolSpec[],
  ): Promise<ResolvedTool[]> {
    if (toolSpecs.length === 0) return [];

    const servers = await this.mcpServerService.listServers();
    const byId = new Map(servers.map((s) => [s.id, s]));
    const resolved: ResolvedTool[] = [];

    for (const spec of toolSpecs) {
      const server = byId.get(spec.serverId);
      if (!server || !server.isEnabled) continue;

      const tools = await this.mcpClient.listTools(server);
      for (const tool of tools) {
        const name = this.buildToolName(server.id, tool.name);
        resolved.push({
          definition: {
            type: "function",
            name,
            description:
              tool.description ?? `${tool.name} (server: ${server.name})`,
            parameters: tool.parameters,
          },
          originalName: tool.name,
          server,
        });
      }
    }

    return resolved;
  }

  private buildToolName(serverId: string, toolName: string): string {
    const safeServer = serverId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeTool = toolName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const combined = `mcp_${safeServer}_${safeTool}`;
    return combined.slice(0, 64);
  }

  private async handleToolCalls(
    chatId: string,
    toolCalls: LLMToolCall[],
    toolMap: Map<string, ResolvedTool>,
    timeoutMs: number,
  ): Promise<LLMChatMessage[]> {
    const toolMessages: LLMChatMessage[] = [];

    for (const call of toolCalls) {
      const resolved = toolMap.get(call.name);
      let content: string;
      let toolResults: unknown = null;

      if (!resolved) {
        content = `Tool ${call.name} is not available.`;
        toolResults = { error: "UNKNOWN_TOOL" };
      } else {
        try {
          const result = await this.executeToolCallWithTimeout(
            resolved.server,
            resolved.originalName,
            call.arguments,
            timeoutMs,
          );
          content = this.formatToolResultContent(result.content);
          toolResults = result.raw ?? result.content;
        } catch (err) {
          content = `Tool ${call.name} failed: ${
            err instanceof Error ? err.message : String(err)
          }`;
          toolResults = {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      await this.messageService.appendMessage({
        chatId,
        role: "tool",
        content,
        toolCallId: call.id,
        toolResults,
      });

      toolMessages.push({
        role: "tool",
        content,
        toolCallId: call.id,
      });
    }

    return toolMessages;
  }

  private async executeToolCallWithTimeout(
    server: MCPServer,
    toolName: string,
    args: unknown,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.mcpClient.callTool(server, toolName, args, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private formatToolResultContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (content === null || content === undefined) return "";
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  private accumulateUsage(
    totals: UsageTotals,
    usage?: LLMChatCompletionUsage,
  ): void {
    if (!usage) return;
    totals.prompt += usage.promptTokens ?? 0;
    totals.completion += usage.completionTokens ?? 0;
    totals.total += usage.totalTokens ?? 0;
  }

  private async finishRunSuccess(
    run: ChatRun,
    assistantMessageId: string,
    usage: UsageTotals,
  ): Promise<void> {
    const finishedAt = nowIso();
    const hasUsage =
      usage.prompt > 0 || usage.completion > 0 || usage.total > 0;

    await this.chatRunRepo.update(run.id, {
      status: "completed",
      assistantMessageId,
      finishedAt,
      tokenUsage: hasUsage
        ? {
            prompt: usage.prompt,
            completion: usage.completion,
            total: usage.total,
          }
        : null,
      error: null,
    });
  }
}
