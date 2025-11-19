import type { MCPServer } from "../../core/entities/MCPServer";
import type {
  CreateMCPServerInput,
  MCPServerRepository,
  UpdateMCPServerInput,
} from "../../core/ports/MCPServerRepository";

export class MCPServerService {
  constructor(private readonly repo: MCPServerRepository) {}

  async registerServer(data: CreateMCPServerInput): Promise<MCPServer> {
    return this.repo.create(data);
  }

  async listServers(): Promise<MCPServer[]> {
    return this.repo.list();
  }

  async getServer(id: string): Promise<MCPServer | null> {
    return this.repo.getById(id);
  }

  async updateServer(
    id: string,
    patch: UpdateMCPServerInput,
  ): Promise<MCPServer | null> {
    return this.repo.update(id, patch);
  }

  async deleteServer(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async setServerEnabled(id: string, isEnabled: boolean): Promise<MCPServer | null> {
    return this.repo.update(id, { isEnabled });
  }
}

