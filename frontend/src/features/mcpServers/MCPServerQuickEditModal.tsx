import type { MCPServer } from "../../api/mcpServers";
import { MCPServerEditPanel } from "./MCPServerEditPanel";

interface MCPServerQuickEditModalProps {
  server: MCPServer;
  isOpen: boolean;
  onClose(): void;
  onSaved(): void | Promise<void>;
}

export function MCPServerQuickEditModal({
  server,
  isOpen,
  onClose,
  onSaved,
}: MCPServerQuickEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "640px" }}
      >
        <MCPServerEditPanel
          server={server}
          onSaved={onSaved}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

