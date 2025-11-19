import { http, unwrap } from "./httpClient";

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isEnabled: boolean;
}

export interface CharacterMCPServer {
  id: string;
  characterId: string;
  mcpServerId: string;
}

export interface CreateMCPServerRequest {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isEnabled?: boolean;
}

export type UpdateMCPServerRequest =
  Partial<CreateMCPServerRequest>;

export async function listMCPServers(): Promise<MCPServer[]> {
  return unwrap(http.get<MCPServer[]>("/mcp-servers"));
}

export async function getMCPServer(id: string): Promise<MCPServer> {
  return unwrap(http.get<MCPServer>(`/mcp-servers/${id}`));
}

export async function createMCPServer(
  payload: CreateMCPServerRequest,
): Promise<MCPServer> {
  return unwrap(http.post<MCPServer>("/mcp-servers", payload));
}

export async function updateMCPServer(
  id: string,
  payload: UpdateMCPServerRequest,
): Promise<MCPServer> {
  return unwrap(
    http.patch<MCPServer>(`/mcp-servers/${id}`, payload),
  );
}

export async function deleteMCPServer(id: string): Promise<void> {
  await unwrap(http.delete<void>(`/mcp-servers/${id}`));
}

export async function listCharacterMCPServers(
  characterId: string,
): Promise<CharacterMCPServer[]> {
  return unwrap(
    http.get<CharacterMCPServer[]>(
      `/characters/${characterId}/mcp-servers`,
    ),
  );
}

export async function attachCharacterMCPServer(
  characterId: string,
  mcpServerId: string,
): Promise<CharacterMCPServer> {
  return unwrap(
    http.post<CharacterMCPServer>(
      `/characters/${characterId}/mcp-servers`,
      { mcpServerId },
    ),
  );
}

export async function detachCharacterMCPServer(
  id: string,
): Promise<void> {
  await unwrap(
    http.delete<void>(`/character-mcp-servers/${id}`),
  );
}

