import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("Prompt stack routes", () => {
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
        name: "Char",
        description: "d",
        persona: "p",
        avatarPath: "/avatars/a.png",
      },
    });
    return response.json() as { id: string };
  }

  async function createPreset(title: string) {
    const response = await app.inject({
      method: "POST",
      url: "/presets",
      payload: {
        title,
        description: "d",
        kind: "static_text",
      },
    });
    return response.json() as { id: string };
  }

  it("attaches, lists, reorders and detaches prompt presets", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const character = await createCharacter();
    const p1 = await createPreset("P1");
    const p2 = await createPreset("P2");

    const attach1 = await app.inject({
      method: "POST",
      url: `/characters/${character.id}/prompt-stack`,
      payload: {
        presetId: p1.id,
        role: "system",
      },
    });
    expect(attach1.statusCode).toBe(201);

    const attach2 = await app.inject({
      method: "POST",
      url: `/characters/${character.id}/prompt-stack`,
      payload: {
        presetId: p2.id,
        role: "assistant",
      },
    });
    expect(attach2.statusCode).toBe(201);

    const stackResponse = await app.inject({
      method: "GET",
      url: `/characters/${character.id}/prompt-stack`,
    });
    expect(stackResponse.statusCode).toBe(200);
    const stack = stackResponse.json() as Array<{ presetId: string }>;
    expect(stack.map((pp) => pp.presetId)).toEqual([p1.id, p2.id]);

    const reorderedResponse = await app.inject({
      method: "POST",
      url: `/characters/${character.id}/prompt-stack/reorder`,
      payload: {
        ids: [stack[1].id, stack[0].id],
      },
    });
    expect(reorderedResponse.statusCode).toBe(204);

    const afterReorder = await app.inject({
      method: "GET",
      url: `/characters/${character.id}/prompt-stack`,
    });
    const reordered = afterReorder.json() as Array<{ presetId: string }>;
    expect(reordered.map((pp) => pp.presetId)).toEqual([p2.id, p1.id]);

    const detachResponse = await app.inject({
      method: "DELETE",
      url: `/prompt-presets/${reordered[0].id}`,
    });
    expect(detachResponse.statusCode).toBe(204);
  });

  it("validates attach and reorder payloads", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const character = await createCharacter();

    const badAttach = await app.inject({
      method: "POST",
      url: `/characters/${character.id}/prompt-stack`,
      payload: {
        presetId: "",
        role: "invalid",
      },
    });
    expect(badAttach.statusCode).toBe(400);
    const attachBody = badAttach.json() as any;
    expect(attachBody.error.code).toBe("VALIDATION_ERROR");

    const badReorder = await app.inject({
      method: "POST",
      url: `/characters/${character.id}/prompt-stack/reorder`,
      payload: {
        ids: [1, 2],
      },
    });
    expect(badReorder.statusCode).toBe(400);
    const reorderBody = badReorder.json() as any;
    expect(reorderBody.error.code).toBe("VALIDATION_ERROR");
  });
});

