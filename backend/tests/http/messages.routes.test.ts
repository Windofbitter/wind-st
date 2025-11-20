import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("Message routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createChat() {
    const characterResponse = await app.inject({
      method: "POST",
      url: "/characters",
      payload: {
        name: "Owner",
        description: "d",
        persona: "p",
        avatarPath: "/avatars/owner.png",
      },
    });
    const character = characterResponse.json() as { id: string };

    const chatResponse = await app.inject({
      method: "POST",
      url: "/chats",
      payload: {
        characterId: character.id,
        title: "Chat",
      },
    });
    return chatResponse.json() as { chat: { id: string } };
  }

  it("appends and lists messages with pagination", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const { chat } = await createChat();

    await app.inject({
      method: "POST",
      url: `/chats/${chat.id}/messages`,
      payload: { role: "user", content: "one" },
    });
    await app.inject({
      method: "POST",
      url: `/chats/${chat.id}/messages`,
      payload: { role: "assistant", content: "two" },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/chats/${chat.id}/messages?limit=1&offset=1`,
    });

    expect(listResponse.statusCode).toBe(200);
    const messages = listResponse.json() as Array<{ content: string }>;
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("two");
  });

  it("validates message payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const { chat } = await createChat();

    const response = await app.inject({
      method: "POST",
      url: `/chats/${chat.id}/messages`,
      payload: { role: "invalid", content: 123 },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("validates list query parameters", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const { chat } = await createChat();

    const response = await app.inject({
      method: "GET",
      url: `/chats/${chat.id}/messages?limit=-1`,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});

