import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { LLMChatCompletionRequest } from "../../src/core/ports/LLMClient";
import { createTestApp } from "./testApp";
import { FakeLLMClient } from "../services/fakeOrchestration";

describe("Chat routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createCharacter() {
    const response = await app.inject({
      method: "POST",
      url: "/characters",
      payload: {
        name: "Owner",
        description: "d",
        persona: "p",
        avatarPath: "/avatars/owner.png",
      },
    });
    return response.json() as { id: string };
  }

  async function createLLMConnection() {
    const response = await app.inject({
      method: "POST",
      url: "/llm-connections",
      payload: {
        name: "Primary",
        provider: "openai_compatible",
        baseUrl: "http://example",
        defaultModel: "gpt-4.1",
        apiKey: "sk-test",
      },
    });
    return response.json() as { id: string };
  }

  it("creates a chat with initial config and lists runs and turns", async () => {
    const llmClient = new FakeLLMClient({
      message: { role: "assistant", content: "Hello user" },
      usage: {
        promptTokens: 5,
        completionTokens: 3,
        totalTokens: 8,
      },
    });

    const ctx = await createTestApp({ llmClient });
    app = ctx.app;

    const character = await createCharacter();
    const connection = await createLLMConnection();

    const createChatResponse = await app.inject({
      method: "POST",
      url: "/chats",
      payload: {
        characterId: character.id,
        title: "Test chat",
        initialConfig: {
          llmConnectionId: connection.id,
          model: "gpt-4.1-mini",
          temperature: 0.7,
          maxOutputTokens: 128,
          maxToolIterations: 3,
          toolCallTimeoutMs: 15000,
        },
      },
    });

    expect(createChatResponse.statusCode).toBe(201);
    const created = createChatResponse.json() as {
      chat: { id: string };
      llmConfig: { chatId: string };
    };
    expect(created.llmConfig.chatId).toBe(created.chat.id);

    const turnResponse = await app.inject({
      method: "POST",
      url: `/chats/${created.chat.id}/turns`,
      payload: { content: "Hi" },
    });

    expect(turnResponse.statusCode).toBe(201);
    const assistant = turnResponse.json() as { role: string; content: string };
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toBe("Hello user");

    const calls = (llmClient.calls as LLMChatCompletionRequest[]);
    expect(calls).toHaveLength(1);
    expect(calls[0].messages.at(-1)?.content).toBe("Hi");

    const runsResponse = await app.inject({
      method: "GET",
      url: `/chats/${created.chat.id}/runs`,
    });

    expect(runsResponse.statusCode).toBe(200);
    const runs = runsResponse.json() as Array<{ status: string }>;
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("completed");
  });

  it("validates chat creation payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/chats",
      payload: { title: "" },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

