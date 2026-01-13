import { useState, useEffect } from "react";

import Button from "../ui/button/Button";
import Label from "../form/Label";
import axios from "axios";
import toast from "react-hot-toast";

interface Role {
  role_id: string;
  name: string;
}

interface SetRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleId: string) => Promise<void>;
  memberCount: number;
}

export default function SetRoleModal({ isOpen, onClose, onSave, memberCount }: SetRoleModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Use environment variable or default
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.26:8000/api/pm';


  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      axios.get(`${API_BASE}/roles/`)
        .then(res => setRoles(res.data.results || res.data)) // Handle pagination if any
      .catch(() => toast.error("Failed to load roles"))
      .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedRole) return;
    setSaving(true);
    await onSave(selectedRole);
    setSaving(false);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${isOpen ? '' : 'hidden'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Set Role
            </h3>
            <p className="text-sm text-gray-500 mb-6">
                Assign a role for <strong>{memberCount}</strong> selected employees.
            </p>

            <div className="mb-6">
                <Label>Select Role</Label>
                <select
                    className="w-full px-4 py-2 mt-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    disabled={loading}
                >
                    <option value="">Select a role...</option>
                    {roles.map(role => (
                        <option key={role.role_id} value={role.role_id}>
                            {role.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!selectedRole || saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    </div>
  );
}
