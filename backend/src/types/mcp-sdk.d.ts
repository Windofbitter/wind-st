declare module "@modelcontextprotocol/sdk/client" {
  export class Client {
    constructor(options: Record<string, unknown>);
    connect(transport: any): Promise<void>;
    listTools(): Promise<any>;
    callTool(args: any): Promise<any>;
    close?: () => Promise<void> | void;
  }
}

declare module "@modelcontextprotocol/sdk/client/stdio" {
  export class StdioClientTransport {
    constructor(options: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    });
    close?: () => Promise<void> | void;
  }
}
