import type { UserPersona } from "../entities/UserPersona";

export interface CreateUserPersonaInput {
  name: string;
  description?: string | null;
  prompt?: string | null;
  isDefault?: boolean;
}

export interface UpdateUserPersonaInput {
  name?: string;
  description?: string | null;
  prompt?: string | null;
  isDefault?: boolean;
}

export interface UserPersonaFilter {
  isDefault?: boolean;
}

export interface UserPersonaRepository {
  create(data: CreateUserPersonaInput): Promise<UserPersona>;
  getById(id: string): Promise<UserPersona | null>;
  list(filter?: UserPersonaFilter): Promise<UserPersona[]>;
  update(id: string, patch: UpdateUserPersonaInput): Promise<UserPersona | null>;
  delete(id: string): Promise<void>;
}
