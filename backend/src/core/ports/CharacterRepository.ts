import type { Character } from "../entities/Character";

export interface CreateCharacterInput {
  name: string;
  description: string;
  persona: string;
  avatarPath: string;
  creatorNotes?: string | null;
}

export interface UpdateCharacterInput {
  name?: string;
  description?: string;
  persona?: string;
  avatarPath?: string;
  creatorNotes?: string | null;
}

export interface CharacterFilter {
  nameContains?: string;
}

export interface CharacterRepository {
  create(data: CreateCharacterInput): Promise<Character>;
  getById(id: string): Promise<Character | null>;
  list(filter?: CharacterFilter): Promise<Character[]>;
  update(id: string, patch: UpdateCharacterInput): Promise<Character | null>;
  delete(id: string): Promise<void>;
}

