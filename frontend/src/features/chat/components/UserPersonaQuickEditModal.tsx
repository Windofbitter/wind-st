import { useEffect, useState } from "react";
import type {
  CreateUserPersonaRequest,
  UpdateUserPersonaRequest,
  UserPersona,
} from "../../../api/userPersonas";
import {
  createUserPersona,
  updateUserPersona,
} from "../../../api/userPersonas";
import { ApiError } from "../../../api/httpClient";
import { UserPersonaEditForm } from "../../userPersonas/components/UserPersonaEditForm";

type Mode = "create" | "edit";

interface UserPersonaFormState {
  name: string;
  description: string;
  prompt: string;
  isDefault: boolean;
}

interface UserPersonaQuickEditModalProps {
  mode: Mode;
  isOpen: boolean;
  persona?: UserPersona | null;
  onClose(): void;
  onSaved(persona: UserPersona): void | Promise<void>;
}

const emptyForm: UserPersonaFormState = {
  name: "",
  description: "",
  prompt: "",
  isDefault: false,
};

export function UserPersonaQuickEditModal({
  mode,
  isOpen,
  persona,
  onClose,
  onSaved,
}: UserPersonaQuickEditModalProps) {
  const [form, setForm] = useState<UserPersonaFormState>(
    emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && persona) {
      setForm({
        name: persona.name,
        description: persona.description ?? "",
        prompt: persona.prompt ?? "",
        isDefault: persona.isDefault,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [isOpen, mode, persona?.id]);

  if (!isOpen) return null;

  async function handleSave() {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload: CreateUserPersonaRequest = {
          name: trimmedName,
          description: form.description.trim() || null,
          prompt: form.prompt.trim() || null,
          isDefault: form.isDefault,
        };
        const created = await createUserPersona(payload);
        await onSaved(created);
      } else if (mode === "edit" && persona) {
        const patch: UpdateUserPersonaRequest = {
          name: trimmedName,
          description: form.description.trim() || null,
          prompt: form.prompt.trim() || null,
          isDefault: form.isDefault,
        };
        const updated = await updateUserPersona(persona.id, patch);
        await onSaved(updated);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save user persona",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px" }}
      >
        <UserPersonaEditForm
          form={form}
          onChange={setForm}
          onSave={() => void handleSave()}
          onCancel={onClose}
          saving={saving}
          error={error}
          isEditing={mode === "edit"}
        />
      </div>
    </div>
  );
}

