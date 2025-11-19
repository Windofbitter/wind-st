import { describe, expect, it } from "vitest";
import { PresetService } from "../../src/application/services/PresetService";
import { FakePresetRepository } from "./fakeRepositories";

function createService() {
  const repo = new FakePresetRepository();
  const service = new PresetService(repo);
  return { repo, service };
}

describe("PresetService", () => {
  it("prevents deleting built-in presets", async () => {
    const { service } = createService();

    const builtIn = await service.createPreset({
      title: "BuiltIn",
      description: "d",
      kind: "static_text",
      content: "c",
      builtIn: true,
    });

    await expect(service.deletePreset(builtIn.id)).rejects.toThrowError(
      "Cannot delete built-in preset",
    );
  });

  it("allows deleting non built-in presets", async () => {
    const { service, repo } = createService();

    const preset = await service.createPreset({
      title: "Custom",
      description: "d",
      kind: "static_text",
      content: null,
      builtIn: false,
    });

    await service.deletePreset(preset.id);
    const afterDelete = await repo.getById(preset.id);
    expect(afterDelete).toBeNull();
  });
});
