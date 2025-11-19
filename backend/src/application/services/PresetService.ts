import type { Preset } from "../../core/entities/Preset";
import type {
  CreatePresetInput,
  PresetFilter,
  PresetRepository,
  UpdatePresetInput,
} from "../../core/ports/PresetRepository";

export class PresetService {
  constructor(private readonly repo: PresetRepository) {}

  async createPreset(data: CreatePresetInput): Promise<Preset> {
    return this.repo.create(data);
  }

  async listPresets(filter?: PresetFilter): Promise<Preset[]> {
    return this.repo.list(filter);
  }

  async getPreset(id: string): Promise<Preset | null> {
    return this.repo.getById(id);
  }

  async updatePreset(
    id: string,
    patch: UpdatePresetInput,
  ): Promise<Preset | null> {
    return this.repo.update(id, patch);
  }

  async deletePreset(id: string): Promise<void> {
    const preset = await this.repo.getById(id);
    if (!preset) return;
    if (preset.builtIn) {
      throw new Error("Cannot delete built-in preset");
    }
    await this.repo.delete(id);
  }
}

