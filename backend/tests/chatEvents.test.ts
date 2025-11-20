import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ChatEvent } from "../src/application/services/ChatEventService";
import { registerChatEventRoutes } from "../src/infrastructure/http/routes/chatEvents";

class StubChatEventService {
  listeners = new Map<
    string,
    Set<(event: ChatEvent) => void>
  >();

  subscribe(chatId: string, listener: (event: ChatEvent) => void): () => void {
    const set = this.listeners.get(chatId) ?? new Set();
    set.add(listener);
    this.listeners.set(chatId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(chatId);
      }
    };
  }

  publish(chatId: string, event: ChatEvent): void {
    const listeners = this.listeners.get(chatId);
    if (!listeners) return;
    for (const listener of listeners) {
      listener(event);
    }
  }

  listenerCount(chatId: string): number {
    return this.listeners.get(chatId)?.size ?? 0;
  }
}

async function readNextEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ event: string; data: string }> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      throw new Error("Stream ended before event received");
    }

    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = chunk.split("\n");
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith(":")) continue; // comment
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (dataLines.length === 0) {
        continue;
      }
      return { event, data: dataLines.join("\n") };
    }
  }
}

describe("chat events SSE", () => {
  const chatId = "chat-123";
  let app: ReturnType<typeof Fastify>;
  let stub: StubChatEventService;
  let baseUrl: string;

  beforeEach(async () => {
    stub = new StubChatEventService();
    app = Fastify();
    app.decorate("chatEventService", stub);
    registerChatEventRoutes(app);
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    baseUrl = address;
  });

  afterEach(async () => {
    await app.close();
  });

  it("streams message events with correct headers", async () => {
    const controller = new AbortController();
    const response = await fetch(
      `${baseUrl}/chats/${chatId}/events`,
      { signal: controller.signal },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-cache");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("response body reader missing");

    const sampleMessage = {
      id: "msg-1",
      chatId,
      role: "assistant" as const,
      content: "hi",
      toolCallId: null,
      toolCalls: null,
      toolResults: null,
      tokenCount: null,
    };

    stub.publish(chatId, { type: "message", message: sampleMessage });

    const event = await Promise.race([
      readNextEvent(reader),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("timed out waiting for SSE message")),
          5000,
        ),
      ),
    ]);
    expect(event.event).toBe("message");
    const parsed = JSON.parse(event.data) as ChatEvent;
    expect(parsed.type).toBe("message");
    expect(parsed.message.id).toBe(sampleMessage.id);

    controller.abort();
  });

  it("unsubscribes listeners when client disconnects", async () => {
    const controller = new AbortController();
    const response = await fetch(
      `${baseUrl}/chats/${chatId}/events`,
      { signal: controller.signal },
    );

    // Allow subscription hook to register.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stub.listenerCount(chatId)).toBe(1);

    controller.abort();
    // Allow the close handler to run.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stub.listenerCount(chatId)).toBe(0);
  });
});
