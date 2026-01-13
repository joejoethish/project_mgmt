import { useState } from 'react';
import { useNavigate } from 'react-router';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

// Step components
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
              ${index < currentStep ? 'bg-green-500 text-white' :
                                index === currentStep ? 'bg-blue-600 text-white' :
                                    'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            {index < currentStep ? '✓' : index + 1}
                        </div>
                        <p className={`mt-2 text-xs ${index === currentStep ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                            {step}
                        </p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`h-1 flex-1 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                    )}
                </div>
            ))}
        </div>
    </div>
);

export default function MasterBuilderWizard() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [masterData, setMasterData] = useState<any>(null);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [indexes, setIndexes] = useState<any[]>([]);
    const [availableMasters, setAvailableMasters] = useState<string[]>([]);

    const steps = ['Import JSON', 'Add Relationships', 'Configure Indexes', 'Review & Create'];

    // Step 1: Import JSON
    const handleJsonImport = (jsonContent: string) => {
        try {
            const parsed = JSON.parse(jsonContent);
            setMasterData(parsed);

            // Auto-suggest relationships
            const suggestedRelationships = suggestRelationships(parsed);
            setRelationships(suggestedRelationships);

            // Auto-suggest indexes
            const suggestedIndexes = suggestIndexes(parsed);
            setIndexes(suggestedIndexes);

            // Fetch available masters for relationships
            fetchAvailableMasters();

            setCurrentStep(1);
        } catch (err) {
            alert('Invalid JSON format');
        }
    };

    // AI: Suggest relationships based on field names
    const suggestRelationships = (master: any) => {
        const suggestions: any[] = [];

        master.fields?.forEach((field: any, index: number) => {
            const fieldName = field.name.toLowerCase();

            // Detect potential relationships
            if (fieldName.includes('department') && fieldName.includes('id')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: 'departments',
                    suggestedField: 'id',
                    confidence: 'high',
                    reason: 'Field name contains "department_id"'
                });
            }
            else if (fieldName.includes('location') && fieldName.includes('id')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: 'locations',
                    suggestedField: 'id',
                    confidence: 'high',
                    reason: 'Field name contains "location_id"'
                });
            }
            else if (fieldName.includes('employee') && fieldName.includes('id')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: 'members',
                    suggestedField: 'member_id',
                    confidence: 'high',
                    reason: 'Field name suggests employee reference'
                });
            }
            else if (fieldName.includes('manager') || fieldName.includes('supervisor')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: 'members',
                    suggestedField: 'member_id',
                    confidence: 'medium',
                    reason: 'Field name suggests manager/supervisor'
                });
            }
            else if (fieldName.includes('project') && fieldName.includes('id')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: 'projects',
                    suggestedField: 'project_id',
                    confidence: 'high',
                    reason: 'Field name suggests project reference'
                });
            }
            else if (fieldName.endsWith('_type') || fieldName.endsWith('_category')) {
                suggestions.push({
                    fieldIndex: index,
                    fieldName: field.name,
                    suggestedMaster: fieldName.replace('_type', 's').replace('_category', '_categories'),
                    suggestedField: 'id',
                    confidence: 'medium',
                    reason: 'Field name suggests lookup relationship'
                });
            }
        });

        return suggestions;
    };

    // AI: Suggest indexes for performance
    const suggestIndexes = (master: any) => {
        const suggestions: any[] = [];

        master.fields?.forEach((field: any) => {
            const fieldName = field.name.toLowerCase();

            // Always index unique fields
            if (field.unique) {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'unique',
                    reason: 'Field is marked as unique',
                    priority: 'high',
                    accepted: true
                });
            }
            // Index email fields
            else if (field.type === 'email') {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'btree',
                    reason: 'Email fields are frequently used in lookups',
                    priority: 'high',
                    accepted: true
                });
            }
            // Index foreign key fields
            else if (fieldName.includes('_id') || fieldName.endsWith('id')) {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'btree',
                    reason: 'Foreign key field for JOIN operations',
                    priority: 'high',
                    accepted: true
                });
            }
            // Index status/type fields (for filtering)
            else if (fieldName.includes('status') || fieldName.includes('type') || fieldName.includes('category')) {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'btree',
                    reason: 'Frequently used in WHERE clauses',
                    priority: 'medium',
                    accepted: true
                });
            }
            // Index date fields
            else if (field.type === 'date' || field.type === 'datetime') {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'btree',
                    reason: 'Date fields used in range queries',
                    priority: 'medium',
                    accepted: false
                });
            }
            // Index code fields
            else if (fieldName === 'code' || fieldName.endsWith('_code')) {
                suggestions.push({
                    fieldName: field.name,
                    indexType: 'btree',
                    reason: 'Code fields used for lookups',
                    priority: 'high',
                    accepted: true
                });
            }
        });

        return suggestions;
    };

    const fetchAvailableMasters = async () => {
        try {
            const response = await fetch('http://192.168.1.26:8000/api/masters/masters/');
            if (response.ok) {
                const data = await response.json();
                setAvailableMasters(data.map((m: any) => m.name));
            }
        } catch (err) {
            console.error('Failed to fetch masters');
        }
    };

    const handleCreateMaster = async () => {
        try {
            // Add relationships and indexes to master data
            const finalData = {
                ...masterData,
                relationships,
                indexes: indexes.filter(idx => idx.accepted)
            };

            const response = await fetch('http://192.168.1.26:8000/api/masters/masters/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });

            if (!response.ok) throw new Error('Failed to create master');

            navigate('/masters');
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Master Builder Wizard" />

            <div className="p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
                        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                            Intelligent Master Builder
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            Create masters with AI-powered relationship and index suggestions
                        </p>

                        <StepIndicator currentStep={currentStep} steps={steps} />

                        {/* Step 1: Import JSON */}
                        {currentStep === 0 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Step 1: Import Master Schema
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Paste your JSON schema or upload a file
                                </p>

                                <textarea
                                    className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                    placeholder='Paste JSON here...'
                                    onChange={(e) => {
                                        // Auto-parse on paste
                                        if (e.target.value.trim().startsWith('{')) {
                                            handleJsonImport(e.target.value);
                                        }
                                    }}
                                />

                                <div className="mt-6 flex justify-between">
                                    <button
                                        onClick={() => navigate('/masters')}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const textarea = document.querySelector('textarea');
                                            if (textarea?.value) {
                                                handleJsonImport(textarea.value);
                                            }
                                        }}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Next: Add Relationships →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Relationships */}
                        {currentStep === 1 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Step 2: Configure Relationships
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    AI detected {relationships.length} potential relationships. Review and modify as needed.
                                </p>

                                {relationships.length === 0 ? (
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">
                                            No relationships detected. Click Next to continue.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {relationships.map((rel, index) => (
                                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-semibold
                                ${rel.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                                                    rel.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'}`}>
                                                                {rel.confidence} confidence
                                                            </span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {rel.fieldName}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                            {rel.reason}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs text-gray-500 mb-1">Related Master</label>
                                                                <select
                                                                    value={rel.suggestedMaster}
                                                                    onChange={(e) => {
                                                                        const updated = [...relationships];
                                                                        updated[index].suggestedMaster = e.target.value;
                                                                        setRelationships(updated);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                                >
                                                                    <option value="">Select master...</option>
                                                                    {availableMasters.map(m => (
                                                                        <option key={m} value={m}>{m}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-gray-500 mb-1">Related Field</label>
                                                                <input
                                                                    type="text"
                                                                    value={rel.suggestedField}
                                                                    onChange={(e) => {
                                                                        const updated = [...relationships];
                                                                        updated[index].suggestedField = e.target.value;
                                                                        setRelationships(updated);
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setRelationships(relationships.filter((_, i) => i !== index))}
                                                        className="ml-4 text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 flex justify-between">
                                    <button
                                        onClick={() => setCurrentStep(0)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Next: Configure Indexes →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Indexes */}
                        {currentStep === 2 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Step 3: Configure Indexes
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    AI suggested {indexes.length} indexes for optimal performance. Toggle to accept/reject.
                                </p>

                                <div className="space-y-3">
                                    {indexes.map((idx, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {idx.fieldName}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs
                            ${idx.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                            idx.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                        {idx.priority} priority
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ({idx.indexType} index)
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {idx.reason}
                                                </p>
                                            </div>
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={idx.accepted}
                                                    onChange={(e) => {
                                                        const updated = [...indexes];
                                                        updated[index].accepted = e.target.checked;
                                                        setIndexes(updated);
                                                    }}
                                                    className="mr-2 w-5 h-5"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {idx.accepted ? 'Include' : 'Skip'}
                                                </span>
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-between">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Next: Review & Create →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 3 && (
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Step 4: Review & Confirm
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Review your master configuration before creating
                                </p>

                                <div className="space-y-6">
                                    {/* Master Info */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Master Information</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{masterData?.name}</span></div>
                                            <div><span className="text-gray-500">Display Name:</span> <span className="font-medium">{masterData?.display_name}</span></div>
                                            <div className="col-span-2"><span className="text-gray-500">Description:</span> <span className="font-medium">{masterData?.description}</span></div>
                                            <div><span className="text-gray-500">Fields:</span> <span className="font-medium">{masterData?.fields?.length}</span></div>
                                            <div><span className="text-gray-500">Relationships:</span> <span className="font-medium">{relationships.length}</span></div>
                                            <div><span className="text-gray-500">Indexes:</span> <span className="font-medium">{indexes.filter(i => i.accepted).length}</span></div>
                                        </div>
                                    </div>

                                    {/* Relationships Summary */}
                                    {relationships.length > 0 && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Relationships</h3>
                                            <ul className="text-sm space-y-2">
                                                {relationships.map((rel, i) => (
                                                    <li key={i}>
                                                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{rel.fieldName}</code>
                                                        {' → '}
                                                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{rel.suggestedMaster}.{rel.suggestedField}</code>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Indexes Summary */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Indexes</h3>
                                        <ul className="text-sm space-y-2">
                                            {indexes.filter(i => i.accepted).map((idx, i) => (
                                                <li key={i}>
                                                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{idx.fieldName}</code>
                                                    <span className="text-gray-500 text-xs ml-2">({idx.indexType})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-between">
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleCreateMaster}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                    >
                                        ✓ Create Master
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

