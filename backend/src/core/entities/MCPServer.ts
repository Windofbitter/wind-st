export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isEnabled: boolean;
  status: "unknown" | "ok" | "error";
  lastCheckedAt: string | null;
  toolCount: number | null;
}

