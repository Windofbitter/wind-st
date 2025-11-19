import type { CharacterMCPServer } from "../../core/entities/CharacterMCPServer";
import type { CharacterRepository } from "../../core/ports/CharacterRepository";
import type { MCPServerRepository } from "../../core/ports/MCPServerRepository";
import type { CharacterMCPServerRepository } from "../../core/ports/CharacterMCPServerRepository";
import { AppError } from "../errors/AppError";

export class CharacterMCPServerService {
  constructor(
    private readonly characterRepo: CharacterRepository,
    private readonly mcpServerRepo: MCPServerRepository,
    private readonly characterMcpRepo: CharacterMCPServerRepository,
  ) {}

  async listForCharacter(
    characterId: string,
  ): Promise<CharacterMCPServer[]> {
    return this.characterMcpRepo.listByCharacter(characterId);
  }

  async attachServer(
    characterId: string,
    mcpServerId: string,
  ): Promise<CharacterMCPServer> {
    const character = await this.characterRepo.getById(characterId);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }

    const server = await this.mcpServerRepo.getById(mcpServerId);
    if (!server) {
      throw new AppError("MCP_SERVER_NOT_FOUND", "MCP server not found");
    }

    const existing = await this.characterMcpRepo.listByCharacter(characterId);
    if (existing.some((cm) => cm.mcpServerId === mcpServerId)) {
      return existing.find((cm) => cm.mcpServerId === mcpServerId)!;
    }

    return this.characterMcpRepo.create({
      characterId,
      mcpServerId,
    });
  }

  async detachServer(id: string): Promise<void> {
    await this.characterMcpRepo.delete(id);
  }
}

