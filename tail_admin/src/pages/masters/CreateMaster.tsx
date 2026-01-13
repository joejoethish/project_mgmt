import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mastersApi } from '../../services/dynamicMasterApi';
import { CreateMasterRequest, DynamicMasterField, FieldType } from '../../types/dynamicMaster';

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Dropdown' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'Date & Time' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'url', label: 'URL' },
    { value: 'color', label: 'Color Picker' },
];

// Live Preview Component
function LivePreview({ masterInfo, fields }: { masterInfo: any, fields: any[] }) {
    const hasData = masterInfo.name || masterInfo.display_name || fields.length > 0;

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 sticky top-6 border border-blue-200">
            <h3 className="text-lg font-bold mb-4 text-gray-900 flex items-center">
                <span className="text-2xl mr-2">👁️</span>
                Live Preview
            </h3>

            {!hasData ? (
                <div className="text-center py-12 text-gray-400">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-sm">Start filling the form to see preview</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Master Info Card */}
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">{masterInfo.icon || '📋'}</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">
                                    {masterInfo.display_name || 'Untitled Master'}
                                </h4>
                                {masterInfo.name && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        System name: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{masterInfo.name}</code>
                                    </p>
                                )}
                                {masterInfo.description && (
                                    <p className="text-sm text-gray-600 mt-2">{masterInfo.description}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                    {masterInfo.is_searchable && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">🔍 Searchable</span>
                                    )}
                                    {masterInfo.is_exportable && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">📤 Exportable</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fields List */}
                    {fields.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h5 className="font-semibold text-sm text-gray-700 mb-3">
                                📝 Fields ({fields.length})
                            </h5>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {fields.map((field, idx) => (
                                    <div key={idx} className="text-xs p-2 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-gray-800">
                                                {field.display_name || `Field ${idx + 1}`}
                                            </span>
                                            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-mono">
                                                {field.field_type || 'text'}
                                            </span>
                                        </div>
                                        {field.field_name && (
                                            <p className="text-gray-500 mt-1">
                                                <code>{field.field_name}</code>
                                            </p>
                                        )}
                                        <div className="flex gap-1 mt-1">
                                            {field.is_required && (
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">Required</span>
                                            )}
                                            {field.is_unique && (
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px]">Unique</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CreateMasterPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'visual' | 'json'>('visual');
    const [jsonInput, setJsonInput] = useState('');
    const [jsonPreview, setJsonPreview] = useState<CreateMasterRequest | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Master Info
    const [masterInfo, setMasterInfo] = useState({
        name: '',
        display_name: '',
        description: '',
        icon: '📋',
        is_searchable: true,
        is_exportable: true,
    });

    // Step 2: Fields
    const [fields, setFields] = useState<Partial<DynamicMasterField>[]>([
        {
            field_name: 'name',
            display_name: 'Name',
            field_type: 'text',
            is_required: true,
            is_unique: false,
            show_in_list: true,
            show_in_form: true,
            order: 0,
        }
    ]);

    const addField = () => {
        setFields([...fields, {
            field_name: '',
            display_name: '',
            field_type: 'text',
            is_required: false,
            is_unique: false,
            show_in_list: true,
            show_in_form: true,
            order: fields.length,
        }]);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index: number, updates: Partial<DynamicMasterField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const handleJsonValidate = () => {
        try {
            const parsed = JSON.parse(jsonInput);

            // Validate structure
            if (!parsed.name || !parsed.display_name) {
                setError('JSON must include "name" and "display_name" fields');
                setJsonPreview(null);
                return;
            }

            if (!parsed.fields || !Array.isArray(parsed.fields) || parsed.fields.length === 0) {
                setError('JSON must include "fields" array with at least one field');
                setJsonPreview(null);
                return;
            }

            // Validate each field
            for (const field of parsed.fields) {
                if (!field.field_name || !field.display_name || !field.field_type) {
                    setError('Each field must have field_name, display_name, and field_type');
                    setJsonPreview(null);
                    return;
                }
            }

            setJsonPreview(parsed);
            setError(null);
        } catch (err) {
            setError('Invalid JSON format: ' + (err as Error).message);
            setJsonPreview(null);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            let request: CreateMasterRequest;

            if (mode === 'json') {
                if (!jsonPreview) {
                    setError('Please validate your JSON first');
                    return;
                }
                request = jsonPreview;
            } else {
                // Validate
                if (!masterInfo.name || !masterInfo.display_name) {
                    setError('Master name and display name are required');
                    return;
                }

                if (fields.length === 0) {
                    setError('At least one field is required');
                    return;
                }

                for (const field of fields) {
                    if (!field.field_name || !field.display_name) {
                        setError('All fields must have a field name and display name');
                        return;
                    }
                }

                request = {
                    ...masterInfo,
                    fields: fields as any,
                };
            }

            await mastersApi.createMaster(request);

            alert('Master created successfully!');
            navigate('/masters');
        } catch (err: any) {
            const errorMsg = err.response?.data?.name?.[0] ||
                err.response?.data?.fields?.[0] ||
                err.message ||
                'Failed to create master';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Create New Master</h1>
                <p className="mt-2 text-gray-600">
                    Build your custom master table in just a few steps
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="mb-6 bg-white rounded-lg shadow-md p-2 inline-flex">
                <button
                    onClick={() => setMode('visual')}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${mode === 'visual'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    📝 Visual Builder
                </button>
                <button
                    onClick={() => setMode('json')}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${mode === 'json'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    { } JSON Import
                </button>
            </div>

            {/* JSON Mode - Two Column Layout */}
            {mode === 'json' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: JSON Editor */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold mb-4">Paste JSON Configuration</h2>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    Paste your master configuration in JSON format below:
                                </p>
                                <textarea
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    placeholder={`{
  "name": "department",
  "display_name": "Department Master",
  "description": "Company departments",
  "icon": "🏢",
  "is_searchable": true,
  "is_exportable": true,
  "fields": [
    {
      "field_name": "name",
      "display_name": "Department Name",
      "field_type": "text",
      "is_required": true,
      "is_unique": true,
      "show_in_list": true,
      "show_in_form": true,
      "order": 0
    },
    {
      "field_name": "head",
      "display_name": "Department Head",
      "field_type": "text",
      "is_required": false,
      "show_in_list": true,
      "show_in_form": true,
      "order": 1
    }
  ]
}`}
                                    rows={20}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <button
                                onClick={handleJsonValidate}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                            >
                                ✓ Validate JSON
                            </button>
                        </div>

                    </div>

                    {/* Right Column: Live Preview + Template Help */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Live Preview or Template Help */}
                        {jsonPreview ? (
                            <LivePreview masterInfo={jsonPreview} fields={jsonPreview.fields} />
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sticky top-6">
                                <h3 className="font-semibold mb-3 text-sm">📋 JSON Template</h3>
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <p className="font-bold text-gray-800 mb-1">Required:</p>
                                        <ul className="text-gray-600 space-y-0.5 ml-2">
                                            <li>• <code className="bg-gray-200 px-1 rounded">name</code></li>
                                            <li>• <code className="bg-gray-200 px-1 rounded">display_name</code></li>
                                            <li>• <code className="bg-gray-200 px-1 rounded">fields</code> []</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 mb-1">Optional:</p>
                                        <ul className="text-gray-600 space-y-0.5 ml-2">
                                            <li>• <code className="bg-gray-200 px-1 rounded">description</code></li>
                                            <li>• <code className="bg-gray-200 px-1 rounded">icon</code></li>
                                            <li>• <code className="bg-gray-200 px-1 rounded">is_searchable</code></li>
                                            <li>• <code className="bg-gray-200 px-1 rounded">is_exportable</code></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 mb-1">Field Types:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {['text', 'number', 'email', 'phone', 'select', 'date', 'datetime', 'boolean', 'textarea', 'url', 'color'].map(t => (
                                                <span key={t} className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Create Button for JSON Mode */}
                        {jsonPreview && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium shadow-md"
                            >
                                {loading ? '⏳ Creating...' : '🚀 Create Master'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Visual Mode - Two Column Layout */}
            {mode === 'visual' && (
                <div className="space-y-6">
                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center">
                            <div className="flex items-center space-x-4">
                                {/* Step 1 */}
                                <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${currentStep >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                        1
                                    </div>
                                    <span className="ml-2 font-medium">Master Info</span>
                                </div>

                                <div className="w-16 h-0.5 bg-gray-300"></div>

                                {/* Step 2 */}
                                <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${currentStep >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                        2
                                    </div>
                                    <span className="ml-2 font-medium">Define Fields</span>
                                </div>

                                <div className="w-16 h-0.5 bg-gray-300"></div>

                                {/* Step 3 */}
                                <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${currentStep >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                                        3
                                    </div>
                                    <span className="ml-2 font-medium">Review & Create</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message - Visual Mode */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Step Content - Visual Mode */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        {/* Step 1: Master Info */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold mb-4">Step 1: Master Information</h2>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Master Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={masterInfo.name}
                                            onChange={(e) => setMasterInfo({ ...masterInfo, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                                            placeholder="e.g., department"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Lowercase, no spaces (auto-formatted)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Display Name <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={masterInfo.display_name}
                                            onChange={(e) => setMasterInfo({ ...masterInfo, display_name: e.target.value })}
                                            placeholder="e.g., Department Master"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Human-readable name shown in UI
                                        </p>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={masterInfo.description}
                                            onChange={(e) => setMasterInfo({ ...masterInfo, description: e.target.value })}
                                            placeholder="Brief description of this master..."
                                            rows={3}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Icon (Emoji)
                                        </label>
                                        <input
                                            type="text"
                                            value={masterInfo.icon}
                                            onChange={(e) => setMasterInfo({ ...masterInfo, icon: e.target.value })}
                                            placeholder="📋"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl"
                                            maxLength={2}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={masterInfo.is_searchable}
                                                onChange={(e) => setMasterInfo({ ...masterInfo, is_searchable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Enable Search</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={masterInfo.is_exportable}
                                                onChange={(e) => setMasterInfo({ ...masterInfo, is_exportable: e.target.checked })}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Enable Export</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Define Fields */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold">Step 2: Define Fields</h2>
                                    <button
                                        onClick={addField}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        + Add Field
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="font-semibold text-gray-700">Field #{index + 1}</span>
                                                {fields.length > 1 && (
                                                    <button
                                                        onClick={() => removeField(index)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Field Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.field_name}
                                                        onChange={(e) => updateField(index, {
                                                            field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                                                        })}
                                                        placeholder="e.g., department_name"
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Display Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.display_name}
                                                        onChange={(e) => updateField(index, { display_name: e.target.value })}
                                                        placeholder="e.g., Department Name"
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Field Type *
                                                    </label>
                                                    <select
                                                        value={field.field_type}
                                                        onChange={(e) => updateField(index, { field_type: e.target.value as FieldType })}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    >
                                                        {FIELD_TYPE_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Placeholder
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.placeholder || ''}
                                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                                        placeholder="e.g., Enter name..."
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>

                                                {field.field_type === 'select' && (
                                                    <div className="col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Dropdown Options (comma-separated)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={field.choices_json?.join(', ') || ''}
                                                            onChange={(e) => updateField(index, {
                                                                choices_json: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                            })}
                                                            placeholder="Option 1, Option 2, Option 3"
                                                            className="w-full px-3 py-2 border rounded-lg"
                                                        />
                                                    </div>
                                                )}

                                                <div className="col-span-2 flex flex-wrap gap-4">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.is_required}
                                                            onChange={(e) => updateField(index, { is_required: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="ml-2 text-sm">Required</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.is_unique}
                                                            onChange={(e) => updateField(index, { is_unique: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="ml-2 text-sm">Unique</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.show_in_list}
                                                            onChange={(e) => updateField(index, { show_in_list: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="ml-2 text-sm">Show in Table</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.show_in_form}
                                                            onChange={(e) => updateField(index, { show_in_form: e.target.checked })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="ml-2 text-sm">Show in Form</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold mb-4">Step 3: Review & Create</h2>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="text-3xl mr-4">{masterInfo.icon}</div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{masterInfo.display_name}</h3>
                                            <p className="text-sm text-gray-600 mt-1">Name: {masterInfo.name}</p>
                                            {masterInfo.description && (
                                                <p className="text-sm text-gray-600 mt-2">{masterInfo.description}</p>
                                            )}
                                            <div className="flex gap-3 mt-3">
                                                {masterInfo.is_searchable && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">🔍 Searchable</span>
                                                )}
                                                {masterInfo.is_exportable && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">📤 Exportable</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3">Fields ({fields.length})</h4>
                                    <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <span className="font-medium">{field.display_name}</span>
                                                    <span className="text-sm text-gray-500 ml-2">({field.field_name})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">{field.field_type}</span>
                                                    {field.is_required && <span className="text-red-600 text-xs">Required</span>}
                                                    {field.is_unique && <span className="text-blue-600 text-xs">Unique</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons - Visual Mode Only */}
                    <div className="mt-8 flex justify-between">
                        <button
                            onClick={() => {
                                if (currentStep > 1) setCurrentStep(currentStep - 1);
                                else navigate('/masters');
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            {currentStep === 1 ? 'Cancel' : 'Back'}
                        </button>

                        <button
                            onClick={() => {
                                if (currentStep < 3) setCurrentStep(currentStep + 1);
                                else handleSubmit();
                            }}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                            {loading ? 'Creating...' : currentStep === 3 ? 'Create Master' : 'Next'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

