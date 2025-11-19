import type { LorebookEntry } from "../entities/LorebookEntry";

export interface CreateLorebookEntryInput {
  lorebookId: string;
  keywords: string[];
  content: string;
  insertionOrder: number;
  isEnabled?: boolean;
}

export interface UpdateLorebookEntryInput {
  keywords?: string[];
  content?: string;
  insertionOrder?: number;
  isEnabled?: boolean;
}

export interface LorebookEntryRepository {
  create(data: CreateLorebookEntryInput): Promise<LorebookEntry>;
  getById(id: string): Promise<LorebookEntry | null>;
  listByLorebook(lorebookId: string): Promise<LorebookEntry[]>;
  update(
    id: string,
    patch: UpdateLorebookEntryInput,
  ): Promise<LorebookEntry | null>;
  delete(id: string): Promise<void>;
}

