import crypto from "crypto";
import type { MCPServer } from "../../core/entities/MCPServer";
import type {
  CreateMCPServerInput,
  MCPServerRepository,
  UpdateMCPServerInput,
} from "../../core/ports/MCPServerRepository";
import type { SqliteDatabase } from "./db";

function mapRowToMCPServer(row: any): MCPServer {
  return {
    id: row.id,
    name: row.name,
    command: row.command,
    args: JSON.parse(row.args) as string[],
    env: JSON.parse(row.env) as Record<string, string>,
    isEnabled: row.is_enabled === 1,
  };
}

export class MCPServerRepositorySqlite implements MCPServerRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(data: CreateMCPServerInput): Promise<MCPServer> {
    const id = crypto.randomUUID();
    const isEnabled = data.isEnabled ?? true;

    const stmt = this.db.prepare(
      `
      INSERT INTO mcp_servers (
        id,
        name,
        command,
        args,
        env,
        is_enabled
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `.trim(),
    );

    stmt.run(
      id,
      data.name,
      data.command,
      JSON.stringify(data.args),
      JSON.stringify(data.env),
      isEnabled ? 1 : 0,
    );

    return {
      id,
      name: data.name,
      command: data.command,
      args: data.args,
      env: data.env,
      isEnabled,
    };
  }

  async getById(id: string): Promise<MCPServer | null> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        command,
        args,
        env,
        is_enabled
      FROM mcp_servers
      WHERE id = ?
    `.trim(),
    );

    const row = stmt.get(id);
    if (!row) return null;
    return mapRowToMCPServer(row);
  }

  async list(): Promise<MCPServer[]> {
    const stmt = this.db.prepare(
      `
      SELECT
        id,
        name,
        command,
        args,
        env,
        is_enabled
      FROM mcp_servers
      ORDER BY name ASC
    `.trim(),
    );

    const rows = stmt.all();
    return rows.map(mapRowToMCPServer);
  }

  async update(
    id: string,
    patch: UpdateMCPServerInput,
  ): Promise<MCPServer | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ?");
      params.push(patch.name);
    }
    if (patch.command !== undefined) {
      sets.push("command = ?");
      params.push(patch.command);
    }
    if (patch.args !== undefined) {
      sets.push("args = ?");
      params.push(JSON.stringify(patch.args));
    }
    if (patch.env !== undefined) {
      sets.push("env = ?");
      params.push(JSON.stringify(patch.env));
    }
    if (patch.isEnabled !== undefined) {
      sets.push("is_enabled = ?");
      params.push(patch.isEnabled ? 1 : 0);
    }

    if (sets.length === 0) {
      return this.getById(id);
    }

    const sql =
      `
      UPDATE mcp_servers
      SET ${sets.join(", ")}
      WHERE id = ?
    `.trim();

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params, id);
    if (result.changes === 0) {
      return null;
    }
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM mcp_servers WHERE id = ?");
    stmt.run(id);
  }
}

