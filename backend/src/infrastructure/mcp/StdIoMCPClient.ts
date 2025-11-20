import { AppError } from "../../application/errors/AppError";
import type {
  MCPClient,
  MCPToolDefinition,
  MCPToolResult,
} from "../../core/ports/MCPClient";
import type { MCPServer } from "../../core/entities/MCPServer";

interface ServerConnection {
  server: MCPServer;
  client: any;
  transport: any;
}

/**
 * StdIoMCPClient connects to MCP servers using the official TypeScript SDK
 * over stdio. It maintains one shared connection per MCPServer and exposes
 * a minimal listTools/callTool API to the rest of the app.
 */
export class StdIoMCPClient implements MCPClient {
  private readonly connections = new Map<string, Promise<ServerConnection>>();

  constructor(
    private readonly clientName = "wind-st-backend",
    private readonly clientVersion = "1.0.0",
  ) {}

  async listTools(server: MCPServer): Promise<MCPToolDefinition[]> {
    const connection = await this.getConnection(server);

    try {
      const response = await connection.client.listTools();
      const tools = Array.isArray(response?.tools) ? response.tools : [];

      return tools.map((tool: any): MCPToolDefinition => ({
        name: String(tool.name),
        description:
          typeof tool.description === "string"
            ? tool.description
            : typeof tool.title === "string"
              ? tool.title
              : undefined,
        parameters: tool.inputSchema ?? undefined,
      }));
    } catch (err) {
      throw this.wrapError(
        `Failed to list tools for MCP server '${server.name}'`,
        err,
      );
    }
  }

  async callTool(
    server: MCPServer,
    toolName: string,
    args: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<MCPToolResult> {
    const connection = await this.getConnection(server, options?.signal);

    const invoke = async (): Promise<MCPToolResult> => {
      try {
        const result = await connection.client.callTool({
          name: toolName,
          arguments: args ?? {},
        });
        return this.formatToolResult(result);
      } catch (err) {
        throw this.wrapError(
          `MCP tool '${toolName}' failed on server '${server.name}'`,
          err,
        );
      }
    };

    const signal = options?.signal;
    if (!signal) {
      return invoke();
    }

    if (signal.aborted) {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `MCP tool '${toolName}' call was aborted`,
      );
    }

    return await new Promise<MCPToolResult>((resolve, reject) => {
      const abortHandler = () => {
        signal.removeEventListener("abort", abortHandler);
        void this.dropConnection(server.id);
        reject(
          new AppError(
            "EXTERNAL_LLM_ERROR",
            `MCP tool '${toolName}' call timed out or was aborted`,
          ),
        );
      };

      signal.addEventListener("abort", abortHandler);

      void invoke().then(
        (value) => {
          signal.removeEventListener("abort", abortHandler);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener("abort", abortHandler);
          reject(err);
        },
      );
    });
  }

  private async getConnection(
    server: MCPServer,
    signal?: AbortSignal,
  ): Promise<ServerConnection> {
    let promise = this.connections.get(server.id);
    if (!promise) {
      promise = this.createConnection(server);
      this.connections.set(server.id, promise);
    }

    if (!signal) {
      return promise;
    }

    if (signal.aborted) {
      throw new AppError(
        "EXTERNAL_LLM_ERROR",
        `MCP operation aborted before connecting to server '${server.name}'`,
      );
    }

    return await new Promise<ServerConnection>((resolve, reject) => {
      const abortHandler = () => {
        signal.removeEventListener("abort", abortHandler);
        reject(
          new AppError(
            "EXTERNAL_LLM_ERROR",
            `MCP operation aborted while connecting to server '${server.name}'`,
          ),
        );
      };

      signal.addEventListener("abort", abortHandler);

      void promise!.then(
        (connection) => {
          signal.removeEventListener("abort", abortHandler);
          resolve(connection);
        },
        (err) => {
          signal.removeEventListener("abort", abortHandler);
          reject(
            this.wrapError(
              `Failed to connect to MCP server '${server.name}'`,
              err,
            ),
          );
        },
      );
    });
  }

  private async createConnection(server: MCPServer): Promise<ServerConnection> {
    try {
      const clientModule = (await import(
        "@modelcontextprotocol/sdk/client/index.js"
      )) as any;
      const transportModule = (await import(
        "@modelcontextprotocol/sdk/client/stdio.js"
      )) as any;

      const TransportCtor = transportModule.StdioClientTransport;
      const ClientCtor = clientModule.Client;

      if (!TransportCtor || !ClientCtor) {
        throw new Error(
          "Failed to load MCP SDK client or stdio transport exports",
        );
      }

      const transport = new TransportCtor({
        command: server.command,
        args: server.args,
        env: server.env,
      });

      const client = new ClientCtor({
        name: this.clientName,
        version: this.clientVersion,
      });

      await client.connect(transport);

      return { server, client, transport };
    } catch (err) {
      throw this.wrapError(
        `Failed to start MCP server '${server.name}' with command '${server.command}'`,
        err,
      );
    }
  }

  private async dropConnection(serverId: string): Promise<void> {
    const existing = this.connections.get(serverId);
    this.connections.delete(serverId);

    if (!existing) return;

    try {
      const connection = await existing;
      if (!connection) return;

      if (typeof connection.client?.close === "function") {
        await connection.client.close();
      } else if (typeof connection.transport?.close === "function") {
        await connection.transport.close();
      }
    } catch {
      // Best-effort cleanup; ignore close errors.
    }
  }

  private formatToolResult(result: any): MCPToolResult {
    if (!result) {
      return { content: "", raw: result };
    }

    const contentItems = Array.isArray(result.content) ? result.content : [];
    const parts: string[] = [];

    for (const item of contentItems) {
      if (!item || typeof item !== "object") continue;

      const type = (item as any).type;

      if (type === "text" && typeof (item as any).text === "string") {
        parts.push((item as any).text);
      } else if (type === "resource" || type === "resource_link") {
        const uri = (item as any).uri ?? "(no uri)";
        const name = (item as any).name ?? "";
        parts.push(
          name ? `Resource: ${name} <${uri}>` : `Resource: ${uri}`,
        );
      } else if (type === "image") {
        parts.push("[image content]");
      } else {
        try {
          parts.push(JSON.stringify(item));
        } catch {
          parts.push(String(item));
        }
      }
    }

    let text = parts.join("\n");

    if (!text && result.structuredContent !== undefined) {
      try {
        text = JSON.stringify(result.structuredContent);
      } catch {
        text = String(result.structuredContent);
      }
    }

    if (!text && typeof result === "string") {
      text = result;
    }

    return {
      content: text,
      raw: result,
    };
  }

  private wrapError(message: string, cause: unknown): AppError {
    if (cause instanceof AppError) return cause;

    const details =
      cause instanceof Error
        ? { message: cause.message, stack: cause.stack }
        : { error: String(cause) };

    return new AppError("EXTERNAL_LLM_ERROR", message, {
      details,
      cause,
    });
  }
}

