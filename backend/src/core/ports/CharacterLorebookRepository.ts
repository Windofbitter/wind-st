import type { CharacterLorebook } from "../entities/CharacterLorebook";

export interface CreateCharacterLorebookInput {
  characterId: string;
  lorebookId: string;
}

export interface CharacterLorebookRepository {
  create(data: CreateCharacterLorebookInput): Promise<CharacterLorebook>;
  getById(id: string): Promise<CharacterLorebook | null>;
  listByCharacter(characterId: string): Promise<CharacterLorebook[]>;
  delete(id: string): Promise<void>;
}

