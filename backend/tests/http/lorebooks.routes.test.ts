import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "./testApp";

describe("Lorebook routes", () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("creates lorebook and manages entries", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const createResponse = await app.inject({
      method: "POST",
      url: "/lorebooks",
      payload: {
        name: "World",
        description: "desc",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const lorebook = createResponse.json() as { id: string };

    const entryResponse = await app.inject({
      method: "POST",
      url: `/lorebooks/${lorebook.id}/entries`,
      payload: {
        keywords: ["k1", "k2"],
        content: "lore",
        insertionOrder: 0,
        isEnabled: true,
      },
    });

    expect(entryResponse.statusCode).toBe(201);
    const entry = entryResponse.json() as { id: string };

    const listEntriesResponse = await app.inject({
      method: "GET",
      url: `/lorebooks/${lorebook.id}/entries`,
    });

    expect(listEntriesResponse.statusCode).toBe(200);
    const entries = listEntriesResponse.json() as Array<{ id: string }>;
    expect(entries.map((e) => e.id)).toContain(entry.id);

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/lorebook-entries/${entry.id}`,
      payload: { content: "updated" },
    });

    expect(patchResponse.statusCode).toBe(200);
    const updated = patchResponse.json() as { content: string };
    expect(updated.content).toBe("updated");

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/lorebook-entries/${entry.id}`,
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  it("validates lorebook payload", async () => {
    const ctx = await createTestApp();
    app = ctx.app;

    const response = await app.inject({
      method: "POST",
      url: "/lorebooks",
      payload: { name: "", description: 1 },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});

