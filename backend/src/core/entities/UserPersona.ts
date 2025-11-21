export interface UserPersona {
  id: string;
  name: string;
  description?: string | null;
  prompt?: string | null;
  isDefault: boolean;
}
