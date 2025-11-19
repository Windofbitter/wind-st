import { http, unwrap } from "./httpClient";

export interface Lorebook {
  id: string;
  name: string;
  description: string;
}

export interface LorebookEntry {
  id: string;
  lorebookId: string;
  keywords: string[];
  content: string;
  insertionOrder: number;
  isEnabled: boolean;
}

export interface CharacterLorebook {
  id: string;
  characterId: string;
  lorebookId: string;
}

export interface ListLorebooksParams {
  nameContains?: string;
}

export interface CreateLorebookRequest {
  name: string;
  description: string;
}

export type UpdateLorebookRequest = Partial<CreateLorebookRequest>;

export interface CreateLorebookEntryRequest {
  keywords: string[];
  content: string;
  insertionOrder: number;
  isEnabled?: boolean;
}

export type UpdateLorebookEntryRequest =
  Partial<CreateLorebookEntryRequest>;

export async function listLorebooks(
  params?: ListLorebooksParams,
): Promise<Lorebook[]> {
  return unwrap(http.get<Lorebook[]>("/lorebooks", { params }));
}

export async function getLorebook(id: string): Promise<Lorebook> {
  return unwrap(http.get<Lorebook>(`/lorebooks/${id}`));
}

export async function createLorebook(
  payload: CreateLorebookRequest,
): Promise<Lorebook> {
  return unwrap(http.post<Lorebook>("/lorebooks", payload));
}

export async function updateLorebook(
  id: string,
  payload: UpdateLorebookRequest,
): Promise<Lorebook> {
  return unwrap(http.patch<Lorebook>(`/lorebooks/${id}`, payload));
}

export async function deleteLorebook(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/lorebooks/${id}`));
}

export async function listLorebookEntries(
  lorebookId: string,
): Promise<LorebookEntry[]> {
  return unwrap(
    http.get<LorebookEntry[]>(`/lorebooks/${lorebookId}/entries`),
  );
}

export async function createLorebookEntry(
  lorebookId: string,
  payload: CreateLorebookEntryRequest,
): Promise<LorebookEntry> {
  return unwrap(
    http.post<LorebookEntry>(
      `/lorebooks/${lorebookId}/entries`,
      payload,
    ),
  );
}

export async function updateLorebookEntry(
  entryId: string,
  payload: UpdateLorebookEntryRequest,
): Promise<LorebookEntry> {
  return unwrap(
    http.patch<LorebookEntry>(
      `/lorebook-entries/${entryId}`,
      payload,
    ),
  );
}

export async function deleteLorebookEntry(
  entryId: string,
): Promise<void> {
  await unwrap(
    http.delete<void>(`/lorebook-entries/${entryId}`),
  );
}

export async function listCharacterLorebooks(
  characterId: string,
): Promise<CharacterLorebook[]> {
  return unwrap(
    http.get<CharacterLorebook[]>(
      `/characters/${characterId}/lorebooks`,
    ),
  );
}

export async function attachCharacterLorebook(
  characterId: string,
  lorebookId: string,
): Promise<CharacterLorebook> {
  return unwrap(
    http.post<CharacterLorebook>(
      `/characters/${characterId}/lorebooks`,
      { lorebookId },
    ),
  );
}

export async function detachCharacterLorebook(
  id: string,
): Promise<void> {
  await unwrap(
    http.delete<void>(`/character-lorebooks/${id}`),
  );
}

