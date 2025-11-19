# Data Entities

## 1. Character
The core persona the user interacts with.
- **id**: UUID
- **name**: String (Display name)
- **description**: String (Short bio for the UI list)
- **persona**: String (The full system prompt/personality instructions)
- **avatar_path**: String (Local path to the image file)
- **creator_notes**: String (Optional metadata)

## 2. Chat
A container for a conversation history.
- **id**: UUID
- **character_id**: UUID (FK to Character)
- **title**: String (e.g., "The Tavern Encounter")
- **created_at**: Timestamp
- **updated_at**: Timestamp

## 3. Message
A single turn in the conversation.
- **id**: UUID
- **chat_id**: UUID (FK to Chat)
- **role**: Enum (user, assistant, system, tool)
- **content**: Text (The message body)
- **tool_calls**: JSON (If the AI requested a tool execution)
- **tool_results**: JSON (The output from the tool)
- **token_count**: Integer (For context window management)

## 4. Lorebook
A collection of world info entries.
- **id**: UUID
- **name**: String
- **description**: String
- **is_global**: Boolean (If true, active for all characters)

## 5. LorebookEntry
A specific fact triggered by keywords.
- **id**: UUID
- **lorebook_id**: UUID (FK to Lorebook)
- **keywords**: Array<String> (Triggers: ["dragon", "fire"])
- **content**: Text (The info to inject)
- **insertion_order**: Integer (Priority)
- **is_enabled**: Boolean

## 6. Preset
Reusable prompt block definition.
- **id**: UUID
- **title**: String (Display title for the creator)
- **description**: String (Optional, for UI help)
- **kind**: Enum (static_text, lorebook, history, mcp_tools)
- **content**: Text (Only used when kind = static_text)
- **built_in**: Boolean (True for built-in presets like conversation history or default tool sets)
- **config**: JSON (Kind-specific options, e.g. { lorebook_id }, history settings, { mcp_server_ids })

## 7. PromptPreset
Per-character prompt stack entry.
- **id**: UUID
- **character_id**: UUID (FK to Character)
- **preset_id**: UUID (FK to Preset)
- **role**: Enum (system, assistant, user) (Primarily for static_text; other kinds typically map to system)
- **sort_order**: Integer (For drag-and-drop ordering)

## 8. MCPServer
Configuration for an external tool provider.
- **id**: UUID
- **name**: String (e.g., "Filesystem Server")
- **command**: String (e.g., "npx")
- **args**: Array<String> (e.g., ["-y", "@modelcontextprotocol/server-filesystem"])
- **env**: JSON (Environment variables)
- **is_enabled**: Boolean

## 9. LLMConnection
Configuration for an LLM provider endpoint.
- **id**: UUID
- **name**: String (e.g., "OpenAI Compatible Main", "Local Ollama")
- **provider**: Enum (Currently only openai_compatible; future providers may be added)
- **base_url**: String (Base URL for the OpenAI-compatible API)
- **default_model**: String (e.g., "gpt-4.1-mini")
- **is_enabled**: Boolean

## 10. ChatLLMConfig
Per-chat LLM configuration.
- **id**: UUID
- **chat_id**: UUID (FK to Chat)
- **llm_connection_id**: UUID (FK to LLMConnection)
- **model**: String
- **temperature**: Float
- **max_output_tokens**: Integer
