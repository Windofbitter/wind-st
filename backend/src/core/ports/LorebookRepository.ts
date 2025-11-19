import type { Lorebook } from "../entities/Lorebook";

export interface CreateLorebookInput {
  name: string;
  description: string;
  isGlobal?: boolean;
}

export interface UpdateLorebookInput {
  name?: string;
  description?: string;
  isGlobal?: boolean;
}

export interface LorebookFilter {
  isGlobal?: boolean;
  nameContains?: string;
}

export interface LorebookRepository {
  create(data: CreateLorebookInput): Promise<Lorebook>;
  getById(id: string): Promise<Lorebook | null>;
  list(filter?: LorebookFilter): Promise<Lorebook[]>;
  update(id: string, patch: UpdateLorebookInput): Promise<Lorebook | null>;
  delete(id: string): Promise<void>;
}

