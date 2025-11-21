import { http, unwrap } from "./httpClient";

export interface UserPersona {
  id: string;
  name: string;
  description?: string | null;
  prompt?: string | null;
  isDefault: boolean;
}

export interface ListUserPersonaParams {
  isDefault?: boolean;
}

export interface CreateUserPersonaRequest {
  name: string;
  description?: string | null;
  prompt?: string | null;
  isDefault?: boolean;
}

export type UpdateUserPersonaRequest = Partial<CreateUserPersonaRequest>;

export async function listUserPersonas(
  params?: ListUserPersonaParams,
): Promise<UserPersona[]> {
  return unwrap(http.get<UserPersona[]>("/user-personas", { params }));
}

export async function createUserPersona(
  payload: CreateUserPersonaRequest,
): Promise<UserPersona> {
  return unwrap(http.post<UserPersona>("/user-personas", payload));
}

export async function updateUserPersona(
  id: string,
  payload: UpdateUserPersonaRequest,
): Promise<UserPersona> {
  return unwrap(http.patch<UserPersona>(`/user-personas/${id}`, payload));
}

export async function deleteUserPersona(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/user-personas/${id}`));
}
