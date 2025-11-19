import type { Lorebook } from "../../core/entities/Lorebook";
import type { LorebookEntry } from "../../core/entities/LorebookEntry";
import type {
  CreateLorebookInput,
  LorebookFilter,
  LorebookRepository,
  UpdateLorebookInput,
} from "../../core/ports/LorebookRepository";
import type {
  CreateLorebookEntryInput,
  LorebookEntryRepository,
  UpdateLorebookEntryInput,
} from "../../core/ports/LorebookEntryRepository";
import { AppError } from "../errors/AppError";

export class LorebookService {
  constructor(
    private readonly lorebookRepo: LorebookRepository,
    private readonly entryRepo: LorebookEntryRepository,
  ) {}

  async createLorebook(data: CreateLorebookInput): Promise<Lorebook> {
    return this.lorebookRepo.create(data);
  }

  async listLorebooks(filter?: LorebookFilter): Promise<Lorebook[]> {
    return this.lorebookRepo.list(filter);
  }

  async getLorebook(id: string): Promise<Lorebook | null> {
    return this.lorebookRepo.getById(id);
  }

  async updateLorebook(
    id: string,
    patch: UpdateLorebookInput,
  ): Promise<Lorebook | null> {
    return this.lorebookRepo.update(id, patch);
  }

  async deleteLorebook(id: string): Promise<void> {
    await this.lorebookRepo.delete(id);
  }

  async createLorebookEntry(
    lorebookId: string,
    data: Omit<CreateLorebookEntryInput, "lorebookId">,
  ): Promise<LorebookEntry> {
    const lorebook = await this.lorebookRepo.getById(lorebookId);
    if (!lorebook) {
      throw new AppError("LOREBOOK_NOT_FOUND", "Lorebook not found");
    }

    return this.entryRepo.create({
      ...data,
      lorebookId,
    });
  }

  async listLorebookEntries(lorebookId: string): Promise<LorebookEntry[]> {
    return this.entryRepo.listByLorebook(lorebookId);
  }

  async updateLorebookEntry(
    entryId: string,
    patch: UpdateLorebookEntryInput,
  ): Promise<LorebookEntry | null> {
    return this.entryRepo.update(entryId, patch);
  }

  async deleteLorebookEntry(entryId: string): Promise<void> {
    await this.entryRepo.delete(entryId);
  }
}
