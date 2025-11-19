import { describe, expect, it } from "vitest";
import { LLMConnectionService } from "../../src/application/services/LLMConnectionService";
import { FakeLLMConnectionRepository } from "./fakeRepositories";

function createService() {
  const repo = new FakeLLMConnectionRepository();
  const service = new LLMConnectionService(repo);
  return { repo, service };
}

describe("LLMConnectionService", () => {
  it("creates, lists, gets, updates and deletes connections", async () => {
    const { service, repo } = createService();

    const created = await service.createConnection({
      name: "Conn",
      provider: "openai_compatible",
      baseUrl: "http://localhost",
      defaultModel: "gpt",
      isEnabled: true,
    });

    const list = await service.listConnections();
    expect(list).toHaveLength(1);

    const fetched = await service.getConnection(created.id);
    expect(fetched?.name).toBe("Conn");

    const updated = await service.updateConnection(created.id, {
      baseUrl: "http://example",
      isEnabled: false,
    });
    expect(updated?.baseUrl).toBe("http://example");
    expect(updated?.isEnabled).toBe(false);

    await repo.delete(created.id);
    const afterDelete = await service.getConnection(created.id);
    expect(afterDelete).toBeNull();
  });
});
