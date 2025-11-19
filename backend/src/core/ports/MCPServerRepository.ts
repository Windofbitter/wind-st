import type { MCPServer } from "../entities/MCPServer";

export interface CreateMCPServerInput {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isEnabled?: boolean;
}

export interface UpdateMCPServerInput {
  name?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  isEnabled?: boolean;
}

export interface MCPServerRepository {
  create(data: CreateMCPServerInput): Promise<MCPServer>;
  getById(id: string): Promise<MCPServer | null>;
  list(): Promise<MCPServer[]>;
  update(id: string, patch: UpdateMCPServerInput): Promise<MCPServer | null>;
  delete(id: string): Promise<void>;
}

