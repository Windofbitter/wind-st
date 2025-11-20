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
      apiKey: "sk-service",
      isEnabled: true,
    });

    const list = await service.listConnections();
    expect(list).toHaveLength(1);

    const fetched = await service.getConnection(created.id);
    expect(fetched?.name).toBe("Conn");
    expect(fetched?.apiKey).toBe("sk-service");

    const updated = await service.updateConnection(created.id, {
      baseUrl: "http://example",
      isEnabled: false,
    });
    expect(updated?.baseUrl).toBe("http://example");
    expect(updated?.apiKey).toBe("sk-service");
    expect(updated?.isEnabled).toBe(false);

    await repo.delete(created.id);
    const afterDelete = await service.getConnection(created.id);
    expect(afterDelete).toBeNull();
  });

  it("returns the first enabled connection as default", async () => {
    const { service } = createService();

    const disabled = await service.createConnection({
      name: "Disabled",
      provider: "openai_compatible",
      baseUrl: "http://disabled",
      defaultModel: "gpt-disabled",
      apiKey: "sk",
      isEnabled: false,
    });
    const enabled = await service.createConnection({
      name: "Enabled",
      provider: "openai_compatible",
      baseUrl: "http://enabled",
      defaultModel: "gpt-enabled",
      apiKey: "sk",
      isEnabled: true,
    });

    const defaultConn = await service.getDefaultConnection();
    expect(defaultConn?.id).toBe(enabled.id);

    const preferred = await service.getDefaultConnection(disabled.id);
    expect(preferred?.id).toBe(disabled.id);
  });
});
