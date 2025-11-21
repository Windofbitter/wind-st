export type AppErrorCode =
  | "CHAT_BUSY"
  | "CHAT_NOT_FOUND"
  | "CHAT_LLM_CONFIG_NOT_FOUND"
  | "LLM_CONNECTION_NOT_FOUND"
  | "LLM_CONNECTION_DISABLED"
  | "LLM_MODELS_UNAVAILABLE"
  | "CANNOT_DELETE_BUILT_IN_PRESET"
  | "CANNOT_DELETE_LLM_CONNECTION_IN_USE"
  | "LOREBOOK_NOT_FOUND"
  | "LOREBOOK_ENTRY_NOT_FOUND"
  | "CHARACTER_NOT_FOUND"
  | "PRESET_NOT_FOUND"
  | "MCP_SERVER_NOT_FOUND"
  | "TOOL_ITERATION_LIMIT"
  | "MESSAGE_NOT_FOUND"
  | "INVALID_MESSAGE_ROLE"
  | "PROMPT_PRESET_REORDER_INCOMPLETE"
  | "PROMPT_PRESET_CHARACTER_MISMATCH"
  | "VALIDATION_ERROR"
  | "EXTERNAL_LLM_ERROR"
  | "USER_PERSONA_NOT_FOUND"
  | "USER_PERSONA_IN_USE"
  | "CANNOT_DELETE_HISTORY_PROMPT";

const DEFAULT_STATUS_BY_CODE: Record<AppErrorCode, number> = {
  CHAT_BUSY: 409,
  CHAT_NOT_FOUND: 404,
  CHAT_LLM_CONFIG_NOT_FOUND: 404,
  LLM_CONNECTION_NOT_FOUND: 404,
  LLM_CONNECTION_DISABLED: 503,
  LLM_MODELS_UNAVAILABLE: 502,
  CANNOT_DELETE_BUILT_IN_PRESET: 400,
  CANNOT_DELETE_LLM_CONNECTION_IN_USE: 409,
  LOREBOOK_NOT_FOUND: 404,
  LOREBOOK_ENTRY_NOT_FOUND: 404,
  CHARACTER_NOT_FOUND: 404,
  PRESET_NOT_FOUND: 404,
  MCP_SERVER_NOT_FOUND: 404,
  TOOL_ITERATION_LIMIT: 400,
  MESSAGE_NOT_FOUND: 404,
  INVALID_MESSAGE_ROLE: 400,
  PROMPT_PRESET_REORDER_INCOMPLETE: 400,
  PROMPT_PRESET_CHARACTER_MISMATCH: 400,
  VALIDATION_ERROR: 400,
  EXTERNAL_LLM_ERROR: 502,
  USER_PERSONA_NOT_FOUND: 404,
  USER_PERSONA_IN_USE: 409,
  CANNOT_DELETE_HISTORY_PROMPT: 400,
};

export interface AppErrorOptions {
  status?: number;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS_BY_CODE[code] ?? 500;
    this.details = options.details;

    if (options.cause !== undefined) {
      (this as any).cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
