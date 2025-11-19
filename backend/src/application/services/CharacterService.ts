import type { Character } from "../../core/entities/Character";
import type {
  CharacterFilter,
  CharacterRepository,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "../../core/ports/CharacterRepository";

export class CharacterService {
  constructor(private readonly repo: CharacterRepository) {}

  async createCharacter(data: CreateCharacterInput): Promise<Character> {
    return this.repo.create(data);
  }

  async getCharacter(id: string): Promise<Character | null> {
    return this.repo.getById(id);
  }

  async listCharacters(filter?: CharacterFilter): Promise<Character[]> {
    return this.repo.list(filter);
  }

  async updateCharacter(
    id: string,
    patch: UpdateCharacterInput,
  ): Promise<Character | null> {
    return this.repo.update(id, patch);
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

