import { describe, expect, it } from "vitest";
import { MCPServerService } from "../../src/application/services/MCPServerService";
import { FakeMCPServerRepository } from "./fakeRepositories";

function createService() {
  const repo = new FakeMCPServerRepository();
  const service = new MCPServerService(repo);
  return { repo, service };
}

describe("MCPServerService", () => {
  it("registers, lists, updates, deletes and toggles servers", async () => {
    const { service } = createService();

    const server = await service.registerServer({
      name: "S",
      command: "node",
      args: ["server.js"],
      env: { NODE_ENV: "test" },
      isEnabled: false,
    });

    const list = await service.listServers();
    expect(list).toHaveLength(1);

    const fetched = await service.getServer(server.id);
    expect(fetched?.isEnabled).toBe(false);

    const updated = await service.updateServer(server.id, {
      command: "node2",
    });
    expect(updated?.command).toBe("node2");

    const enabled = await service.setServerEnabled(server.id, true);
    expect(enabled?.isEnabled).toBe(true);

    await service.deleteServer(server.id);
    const afterDelete = await service.getServer(server.id);
    expect(afterDelete).toBeNull();
  });
});
