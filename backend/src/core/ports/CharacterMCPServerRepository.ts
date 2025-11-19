import type { CharacterMCPServer } from "../entities/CharacterMCPServer";

export interface CreateCharacterMCPServerInput {
  characterId: string;
  mcpServerId: string;
}

export interface CharacterMCPServerRepository {
  create(data: CreateCharacterMCPServerInput): Promise<CharacterMCPServer>;
  getById(id: string): Promise<CharacterMCPServer | null>;
  listByCharacter(characterId: string): Promise<CharacterMCPServer[]>;
  delete(id: string): Promise<void>;
}

