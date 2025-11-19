import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ChatPage } from "./features/chat/ChatPage";
import { CharactersListPage } from "./features/characters/CharactersListPage";
import { CharacterDetailPage } from "./features/characters/CharacterDetailPage";
import { PresetsPage } from "./features/presets/PresetsPage";
import { LorebooksPage } from "./features/lorebooks/LorebooksPage";
import { LorebookDetailPage } from "./features/lorebooks/LorebookDetailPage";
import { LLMConnectionsPage } from "./features/llmConnections/LLMConnectionsPage";
import { MCPServersPage } from "./features/mcpServers/MCPServersPage";
import { RunsPage } from "./features/runs/RunsPage";
import { HealthPage } from "./features/health/HealthPage";
import { SettingsPage } from "./features/settings/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="characters" element={<CharactersListPage />} />
        <Route
          path="characters/:characterId"
          element={<CharacterDetailPage />}
        />
        <Route path="presets" element={<PresetsPage />} />
        <Route path="lorebooks" element={<LorebooksPage />} />
        <Route
          path="lorebooks/:lorebookId"
          element={<LorebookDetailPage />}
        />
        <Route path="llm-connections" element={<LLMConnectionsPage />} />
        <Route path="mcp-servers" element={<MCPServersPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
