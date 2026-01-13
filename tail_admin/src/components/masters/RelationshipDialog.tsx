import { useState, useEffect } from 'react';

export interface RelationshipData {
    sourceField: string;
    targetMaster: string;
    targetField: string;
    type: '1-to-1' | '1-to-many' | 'many-to-many';
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    relatedName?: string;
}

interface RelationshipDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (relationship: RelationshipData) => void;
    editMode?: boolean;
    initialData?: {
        sourceNodeId: string;
        sourceNodeLabel: string;
        targetNodeId: string;
        targetNodeLabel: string;
        sourceHandle?: string;
        targetHandle?: string;
    };
    availableTargets?: Array<{ id: string; label: string; fields: any[] }>;
}

export default function RelationshipDialog({
    isOpen,
    onClose,
    onSave,
    editMode = false,
    initialData,
    availableTargets = [],
}: RelationshipDialogProps) {
    const [formData, setFormData] = useState<RelationshipData>({
        sourceField: initialData?.sourceHandle || '',
        targetMaster: initialData?.targetNodeId || '',
        targetField: initialData?.targetHandle || 'id',
        type: '1-to-many',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        relatedName: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                sourceField: initialData.sourceHandle || prev.sourceField,
                targetMaster: initialData.targetNodeId || prev.targetMaster,
            }));
        }
    }, [initialData]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.sourceField) {
            newErrors.sourceField = 'Source field is required';
        }
        if (!formData.targetMaster) {
            newErrors.targetMaster = 'Target master is required';
        }
        if (!formData.targetField) {
            newErrors.targetField = 'Target field is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSave(formData);
            onClose();
        }
    };

    const targetMaster = availableTargets.find(t => t.id === formData.targetMaster);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {editMode ? '✏️ Edit Relationship' : '🔗 Create Relationship'}
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
                    {/* Source Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">From</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔗</span>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {initialData?.sourceNodeLabel || 'Source Master'}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    Field: {formData.sourceField || 'Not selected'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target Master Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            To Master <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.targetMaster}
                            onChange={(e) => {
                                setFormData(prev => ({
                                    ...prev,
                                    targetMaster: e.target.value,
                                    targetField: 'id', // Reset to default
                                }));
                            }}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                ${errors.targetMaster ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        >
                            <option value="">Select target master...</option>
                            {availableTargets.map((target) => (
                                <option key={target.id} value={target.id}>
                                    {target.label}
                                </option>
                            ))}
                        </select>
                        {errors.targetMaster && <p className="mt-1 text-xs text-red-500">{errors.targetMaster}</p>}
                    </div>

                    {/* Target Field Selection */}
                    {targetMaster && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                To Field <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.targetField}
                                onChange={(e) => setFormData(prev => ({ ...prev, targetField: e.target.value }))}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  ${errors.targetField ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            >
                                <option value="">Select target field...</option>
                                {targetMaster.fields.map((field: any) => (
                                    <option key={field.name} value={field.name}>
                                        {field.label || field.name} ({field.type})
                                    </option>
                                ))}
                            </select>
                            {errors.targetField && <p className="mt-1 text-xs text-red-500">{errors.targetField}</p>}
                        </div>
                    )}

                    {/* Relationship Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Relationship Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: '1-to-1' }))}
                                className={`px-4 py-3 rounded-lg border-2 transition-all
                  ${formData.type === '1-to-1'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">1️⃣↔️1️⃣</div>
                                <div className="text-xs font-medium">One-to-One</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: '1-to-many' }))}
                                className={`px-4 py-3 rounded-lg border-2 transition-all
                  ${formData.type === '1-to-many'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">1️⃣→🔢</div>
                                <div className="text-xs font-medium">One-to-Many</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'many-to-many' }))}
                                className={`px-4 py-3 rounded-lg border-2 transition-all
                  ${formData.type === 'many-to-many'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🔢↔️🔢</div>
                                <div className="text-xs font-medium">Many-to-Many</div>
                            </button>
                        </div>
                    </div>

                    {/* Cascade Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                On Delete
                            </label>
                            <select
                                value={formData.onDelete}
                                onChange={(e) => setFormData(prev => ({ ...prev, onDelete: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="CASCADE">CASCADE - Delete related records</option>
                                <option value="SET NULL">SET NULL - Set to null</option>
                                <option value="RESTRICT">RESTRICT - Prevent deletion</option>
                                <option value="NO ACTION">NO ACTION - Do nothing</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">What happens when parent is deleted</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                On Update
                            </label>
                            <select
                                value={formData.onUpdate}
                                onChange={(e) => setFormData(prev => ({ ...prev, onUpdate: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="CASCADE">CASCADE - Update related records</option>
                                <option value="SET NULL">SET NULL - Set to null</option>
                                <option value="RESTRICT">RESTRICT - Prevent update</option>
                                <option value="NO ACTION">NO ACTION - Do nothing</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">What happens when parent is updated</p>
                        </div>
                    </div>

                    {/* Related Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Related Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.relatedName || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, relatedName: e.target.value }))}
                            placeholder="e.g., employees, manager"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-500">Name for reverse relationship access</p>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {initialData?.sourceNodeLabel}.{formData.sourceField} → {targetMaster?.label || '?'}.{formData.targetField}
                            <div className="mt-2 text-xs">
                                Type: {formData.type} | On Delete: {formData.onDelete}
                            </div>
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
                            {editMode ? '💾 Save Relationship' : '🔗 Create Relationship'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

