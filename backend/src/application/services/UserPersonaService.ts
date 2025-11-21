import type { UserPersona } from "../../core/entities/UserPersona";
import type {
  CreateUserPersonaInput,
  UpdateUserPersonaInput,
  UserPersonaFilter,
  UserPersonaRepository,
} from "../../core/ports/UserPersonaRepository";
import type { ChatRepository } from "../../core/ports/ChatRepository";
import { AppError } from "../errors/AppError";

export class UserPersonaService {
  constructor(
    private readonly repo: UserPersonaRepository,
    private readonly chatRepo?: ChatRepository,
  ) {}

  async create(data: CreateUserPersonaInput): Promise<UserPersona> {
    return this.repo.create(data);
  }

  async list(filter?: UserPersonaFilter): Promise<UserPersona[]> {
    return this.repo.list(filter);
  }

  async getById(id: string): Promise<UserPersona | null> {
    return this.repo.getById(id);
  }

  async update(
    id: string,
    patch: UpdateUserPersonaInput,
  ): Promise<UserPersona | null> {
    return this.repo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    if (this.chatRepo) {
      const dependentChats = await this.chatRepo.list({
        userPersonaId: id,
      });
      if (dependentChats.length > 0) {
        throw new AppError(
          "USER_PERSONA_IN_USE",
          "Cannot delete user persona that is used by chats",
        );
      }
    }
    await this.repo.delete(id);
  }
}
