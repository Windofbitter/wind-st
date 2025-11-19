import type { CharacterLorebook } from "../../core/entities/CharacterLorebook";
import type { CharacterRepository } from "../../core/ports/CharacterRepository";
import type { LorebookRepository } from "../../core/ports/LorebookRepository";
import type { CharacterLorebookRepository } from "../../core/ports/CharacterLorebookRepository";
import { AppError } from "../errors/AppError";

export class CharacterLorebookService {
  constructor(
    private readonly characterRepo: CharacterRepository,
    private readonly lorebookRepo: LorebookRepository,
    private readonly characterLorebookRepo: CharacterLorebookRepository,
  ) {}

  async listForCharacter(characterId: string): Promise<CharacterLorebook[]> {
    return this.characterLorebookRepo.listByCharacter(characterId);
  }

  async attachLorebook(
    characterId: string,
    lorebookId: string,
  ): Promise<CharacterLorebook> {
    const character = await this.characterRepo.getById(characterId);
    if (!character) {
      throw new AppError("CHARACTER_NOT_FOUND", "Character not found");
    }

    const lorebook = await this.lorebookRepo.getById(lorebookId);
    if (!lorebook) {
      throw new AppError("LOREBOOK_NOT_FOUND", "Lorebook not found");
    }

    const existing = await this.characterLorebookRepo.listByCharacter(
      characterId,
    );
    if (existing.some((cl) => cl.lorebookId === lorebookId)) {
      // Already attached; return the existing mapping.
      return existing.find((cl) => cl.lorebookId === lorebookId)!;
    }

    return this.characterLorebookRepo.create({
      characterId,
      lorebookId,
    });
  }

  async detachLorebook(id: string): Promise<void> {
    await this.characterLorebookRepo.delete(id);
  }
}

