import { AppError } from "../../application/errors/AppError";
import type {
  MCPClient,
  MCPProbeResult,
  MCPToolDefinition,
  MCPToolResult,
} from "../../core/ports/MCPClient";
import type { MCPServer } from "../../core/entities/MCPServer";

/**
 * Placeholder MCP client. It keeps the system wired while real MCP support
 * is implemented. Listing tools returns an empty set; calling a tool fails
 * with a deterministic error.
 */
export class NoopMCPClient implements MCPClient {
  async listTools(
    _server: MCPServer,
    _options?: { signal?: AbortSignal },
  ): Promise<MCPToolDefinition[]> {
    return [];
  }

  async callTool(
    _server: MCPServer,
    toolName: string,
    _args: unknown,
  ): Promise<MCPToolResult> {
    throw new AppError("EXTERNAL_LLM_ERROR", `MCP tool '${toolName}' cannot be executed: client not configured`);
  }

  async probe(_server: MCPServer): Promise<MCPProbeResult> {
    return { status: "error", error: "MCP client not configured" };
  }

  async resetConnection(_serverId: string): Promise<void> {
    return;
  }
}
