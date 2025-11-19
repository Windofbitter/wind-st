import type { ChatRun } from "../../src/core/entities/ChatRun";
import type {
  ChatRunRepository,
  CreateChatRunInput,
  UpdateChatRunInput,
} from "../../src/core/ports/ChatRunRepository";
import type {
  LLMChatCompletionRequest,
  LLMChatCompletionResponse,
  LLMClient,
} from "../../src/core/ports/LLMClient";

let runIdCounter = 0;

function nextRunId(): string {
  runIdCounter += 1;
  return `run-${runIdCounter}`;
}

export class FakeChatRunRepository implements ChatRunRepository {
  private items = new Map<string, ChatRun>();

  async create(data: CreateChatRunInput): Promise<ChatRun> {
    const id = nextRunId();
    const run: ChatRun = {
      id,
      chatId: data.chatId,
      status: data.status,
      userMessageId: data.userMessageId,
      assistantMessageId: null,
      startedAt: data.startedAt,
      finishedAt: null,
      error: null,
      tokenUsage: null,
    };
    this.items.set(id, run);
    return run;
  }

  async getById(id: string): Promise<ChatRun | null> {
    return this.items.get(id) ?? null;
  }

  async listByChat(chatId: string): Promise<ChatRun[]> {
    return Array.from(this.items.values()).filter(
      (r) => r.chatId === chatId,
    );
  }

  async update(
    id: string,
    patch: UpdateChatRunInput,
  ): Promise<ChatRun | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: ChatRun = {
      ...existing,
      ...patch,
    };
    this.items.set(id, updated);
    return updated;
  }
}

export class FakeLLMClient implements LLMClient {
  calls: LLMChatCompletionRequest[] = [];

  constructor(
    private readonly response: LLMChatCompletionResponse = {
      message: { role: "assistant", content: "default-response" },
    },
  ) {}

  async completeChat(
    request: LLMChatCompletionRequest,
  ): Promise<LLMChatCompletionResponse> {
    this.calls.push(request);
    return this.response;
  }
}

