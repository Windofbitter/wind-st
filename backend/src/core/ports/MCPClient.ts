import type { MCPServer } from "../entities/MCPServer";

export interface MCPToolDefinition {
  name: string;
  description?: string;
  /** JSONSchema-ish parameters definition. */
  parameters?: unknown;
}

export interface MCPToolResult {
  /** Text form to send back to the model as a tool message. */
  content: string;
  /** Raw structured payload for storage or debugging. */
  raw?: unknown;
}

export interface MCPClient {
  listTools(server: MCPServer): Promise<MCPToolDefinition[]>;
  callTool(
    server: MCPServer,
    toolName: string,
    args: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<MCPToolResult>;
}
