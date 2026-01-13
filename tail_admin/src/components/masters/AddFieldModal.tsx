import { useState } from 'react';

export interface FieldFormData {
    name: string;
    label: string;
    type: string;
    required: boolean;
    unique: boolean;
    isPrimary: boolean;
    isForeign: boolean;
    defaultValue?: string;
    helpText?: string;
    minLength?: number;
    maxLength?: number;
}

interface AddFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (field: FieldFormData) => void;
    existingFields?: FieldFormData[];
    editMode?: boolean;
    initialData?: FieldFormData;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text', icon: '📝' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'uuid', label: 'UUID', icon: '🔑' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'datetime', label: 'DateTime', icon: '🕐' },
    { value: 'boolean', label: 'Boolean', icon: '✓' },
    { value: 'json', label: 'JSON', icon: '{}' },
    { value: 'url', label: 'URL', icon: '🔗' },
];

export default function AddFieldModal({
    isOpen,
    onClose,
    onSave,
    existingFields = [],
    editMode = false,
    initialData,
}: AddFieldModalProps) {
    const [formData, setFormData] = useState<FieldFormData>(
        initialData || {
            name: '',
            label: '',
            type: 'text',
            required: false,
            unique: false,
            isPrimary: false,
            isForeign: false,
            defaultValue: '',
            helpText: '',
        }
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const validateField = () => {
        const newErrors: Record<string, string> = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Field name is required';
        } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
            newErrors.name = 'Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
        } else if (!editMode && existingFields.some(f => f.name === formData.name)) {
            newErrors.name = 'Field name already exists';
        }

        // Label validation
        if (!formData.label.trim()) {
            newErrors.label = 'Field label is required';
        }

        // Primary key validation
        if (formData.isPrimary && existingFields.some(f => f.isPrimary && f.name !== initialData?.name)) {
            newErrors.isPrimary = 'Only one primary key allowed per master';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateField()) {
            onSave(formData);
            onClose();

            // Reset form
            if (!editMode) {
                setFormData({
                    name: '',
                    label: '',
                    type: 'text',
                    required: false,
                    unique: false,
                    isPrimary: false,
                    isForeign: false,
                });
            }
        }
    };

    const handleNameChange = (value: string) => {
        const name = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setFormData(prev => ({
            ...prev,
            name,
            label: prev.label || value, // Auto-fill label if empty
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {editMode ? '✏️ Edit Field' : '➕ Add New Field'}
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
                    {/* Field Name & Label */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Field Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g., first_name"
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm
                  ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            <p className="mt-1 text-xs text-gray-500">Database column name (lowercase, underscores)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Display Label <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="e.g., First Name"
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  ${errors.label ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            />
                            {errors.label && <p className="mt-1 text-xs text-red-500">{errors.label}</p>}
                            <p className="mt-1 text-xs text-gray-500">User-friendly label</p>
                        </div>
                    </div>

                    {/* Field Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Data Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {FIELD_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2
                    ${formData.type === type.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                        }`}
                                >
                                    <span className="text-xl">{type.icon}</span>
                                    <span className="text-sm font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Constraints */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Constraints
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.required}
                                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <span className="text-sm font-medium">Required</span>
                                    <p className="text-xs text-gray-500">Cannot be empty</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.unique}
                                    onChange={(e) => setFormData(prev => ({ ...prev, unique: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <span className="text-sm font-medium">Unique</span>
                                    <p className="text-xs text-gray-500">No duplicates</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.isPrimary}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        isPrimary: e.target.checked,
                                        required: e.target.checked ? true : prev.required,
                                        unique: e.target.checked ? true : prev.unique,
                                    }))}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <span className="text-sm font-medium">⚡ Primary Key</span>
                                    <p className="text-xs text-gray-500">Unique identifier</p>
                                </div>
                            </label>
                            {errors.isPrimary && <p className="col-span-2 text-xs text-red-500">{errors.isPrimary}</p>}

                            <label className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="checkbox"
                                    checked={formData.isForeign}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isForeign: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <div>
                                    <span className="text-sm font-medium">🔗 Foreign Key</span>
                                    <p className="text-xs text-gray-500">Links to another table</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Validation Rules (for text/number) */}
                    {(formData.type === 'text' || formData.type === 'number') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Validation Rules
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        {formData.type === 'text' ? 'Min Length' : 'Min Value'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minLength || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, minLength: parseInt(e.target.value) || undefined }))}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">
                                        {formData.type === 'text' ? 'Max Length' : 'Max Value'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxLength || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxLength: parseInt(e.target.value) || undefined }))}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Default Value */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Default Value (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.defaultValue || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                            placeholder="e.g., active, 0, now()"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
                    </div>

                    {/* Help Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Help Text (Optional)
                        </label>
                        <textarea
                            value={formData.helpText || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                            placeholder="Description or instructions for this field"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
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
                            {editMode ? '💾 Save Changes' : '➕ Add Field'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

