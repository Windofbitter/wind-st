import { http, unwrap } from "./httpClient";

export interface Character {
  id: string;
  name: string;
  description: string;
  persona: string;
  avatarPath: string;
  creatorNotes: string | null;
}

export interface ListCharactersParams {
  name?: string;
}

export interface CreateCharacterRequest {
  name: string;
  description: string;
  persona: string;
  avatarPath: string;
  creatorNotes?: string | null;
}

export type UpdateCharacterRequest = Partial<CreateCharacterRequest>;

export async function listCharacters(
  params?: ListCharactersParams,
): Promise<Character[]> {
  return unwrap(http.get<Character[]>("/characters", { params }));
}

export async function getCharacter(id: string): Promise<Character> {
  return unwrap(http.get<Character>(`/characters/${id}`));
}

export async function createCharacter(
  payload: CreateCharacterRequest,
): Promise<Character> {
  return unwrap(http.post<Character>("/characters", payload));
}

export async function updateCharacter(
  id: string,
  payload: UpdateCharacterRequest,
): Promise<Character> {
  return unwrap(http.patch<Character>(`/characters/${id}`, payload));
}

export async function deleteCharacter(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/characters/${id}`));
}

