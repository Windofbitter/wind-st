import type { LLMConnection } from "../../core/entities/LLMConnection";
import type {
  CreateLLMConnectionInput,
  LLMConnectionRepository,
  UpdateLLMConnectionInput,
} from "../../core/ports/LLMConnectionRepository";

export class LLMConnectionService {
  constructor(private readonly repo: LLMConnectionRepository) {}

  async createConnection(
    data: CreateLLMConnectionInput,
  ): Promise<LLMConnection> {
    return this.repo.create(data);
  }

  async listConnections(): Promise<LLMConnection[]> {
    return this.repo.list();
  }

  async getConnection(id: string): Promise<LLMConnection | null> {
    return this.repo.getById(id);
  }

  async getDefaultConnection(
    preferredId?: string,
  ): Promise<LLMConnection | null> {
    if (preferredId) {
      const preferred = await this.getConnection(preferredId);
      if (preferred) return preferred;
    }

    const all = await this.listConnections();
    if (all.length === 0) return null;

    const firstEnabled = all.find((c) => c.isEnabled);
    return firstEnabled ?? all[0] ?? null;
  }

  async updateConnection(
    id: string,
    patch: UpdateLLMConnectionInput,
  ): Promise<LLMConnection | null> {
    return this.repo.update(id, patch);
  }

  async deleteConnection(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

