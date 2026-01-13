import { useState, useEffect } from 'react';

export interface MasterFormData {
    name: string;
    display_name: string;
    icon: string;
    description?: string;
    searchable: boolean;
    exportable: boolean;
    soft_delete: boolean;
}

interface NewMasterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (master: MasterFormData) => void;
    editMode?: boolean;
    initialData?: MasterFormData;
    existingMasters?: string[];
}

const ICON_SUGGESTIONS = [
    '📋', '📝', '📄', '📊', '📈', '📉', '🏢', '🏦', '🏪', '🏭',
    '👥', '👤', '👔', '🎯', '🎓', '🎨', '💼', '💾', '💻', '🖥️',
    '📁', '📂', '📦', '📮', '📪', '🗂️', '🗃️', '🗄️', '🔖', '🏷️',
    '⚙️', '🔧', '🔨', '🛠️', '⚡', '🔑', '🔒', '🔓', '✅', '❌',
];

export default function NewMasterDialog({
    isOpen,
    onClose,
    onSave,
    editMode = false,
    initialData,
    existingMasters = [],
}: NewMasterDialogProps) {
    const [formData, setFormData] = useState<MasterFormData>(
        initialData || {
            name: '',
            display_name: '',
            icon: '📋',
            description: '',
            searchable: true,
            exportable: true,
            soft_delete: false,
        }
    );

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Master name is required';
        } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
            newErrors.name = 'Name must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
        } else if (!editMode && existingMasters.includes(formData.name)) {
            newErrors.name = 'Master name already exists';
        }

        // Display name validation
        if (!formData.display_name.trim()) {
            newErrors.display_name = 'Display name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSave(formData);
            onClose();

            // Reset form if not in edit mode
            if (!editMode) {
                setFormData({
                    name: '',
                    display_name: '',
                    icon: '📋',
                    description: '',
                    searchable: true,
                    exportable: true,
                    soft_delete: false,
                });
            }
        }
    };

    const handleNameChange = (value: string) => {
        const name = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setFormData(prev => ({
            ...prev,
            name,
            display_name: prev.display_name || value, // Auto-fill display name if empty
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {editMode ? '✏️ Edit Master' : '✨ Create New Master'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Icon Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Icon <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-20 h-20 flex items-center justify-center text-5xl bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
                            >
                                {formData.icon}
                            </button>
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Click to choose an icon</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">Represents your master in the interface</p>
                            </div>
                        </div>

                        {showIconPicker && (
                            <div className="mt-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                                <div className="grid grid-cols-10 gap-2">
                                    {ICON_SUGGESTIONS.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, icon }));
                                                setShowIconPicker(false);
                                            }}
                                            className={`w-10 h-10 flex items-center justify-center text-2xl rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                        ${formData.icon === icon ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : ''}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Master Name & Display Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Master Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g., employees"
                                disabled={editMode}
                                className={`w-full px-3 py-2 border rounded-lg font-mono text-sm
                  ${editMode ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}
                  ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  text-gray-900 dark:text-white`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            <p className="mt-1 text-xs text-gray-500">
                                {editMode ? 'Name cannot be changed' : 'Database table name (lowercase, underscores)'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Display Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.display_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                                placeholder="e.g., Employees"
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  ${errors.display_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                            {errors.display_name && <p className="mt-1 text-xs text-red-500">{errors.display_name}</p>}
                            <p className="mt-1 text-xs text-gray-500">User-friendly name shown in UI</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of this master..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Settings */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Settings
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.searchable}
                                    onChange={(e) => setFormData(prev => ({ ...prev, searchable: e.target.checked }))}
                                    className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">Searchable</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Users can search and filter records in this master
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.exportable}
                                    onChange={(e) => setFormData(prev => ({ ...prev, exportable: e.target.checked }))}
                                    className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">Exportable</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Users can export data to Excel, CSV, or PDF
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.soft_delete}
                                    onChange={(e) => setFormData(prev => ({ ...prev, soft_delete: e.target.checked }))}
                                    className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">Soft Delete</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Mark records as deleted instead of removing permanently
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            {editMode ? '💾 Save Changes' : '✨ Create Master'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

