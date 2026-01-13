import { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import toast from 'react-hot-toast';
import { parseJSONSchema, checkDuplicates, ImportResult } from '../../utils/importHelpers';

interface ImportJSONDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (nodes: Node[], edges: Edge[], mergeMode: boolean) => void;
    existingNodes: Node[];
    handleFieldClick: (field: any, node: any) => void;
    handleAddField: (masterId: string) => void;
}

export default function ImportJSONDialog({
    isOpen,
    onClose,
    onImport,
    existingNodes,
    handleFieldClick,
    handleAddField,
}: ImportJSONDialogProps) {
    const [mode, setMode] = useState<'upload' | 'paste'>('upload');
    const [jsonText, setJsonText] = useState('');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [mergeMode, setMergeMode] = useState(true);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setJsonText(text);
            validateAndParse(text);
        };
        reader.onerror = () => {
            toast.error('Failed to read file');
        };
        reader.readAsText(file);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            toast.error('Please upload a .json file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setJsonText(text);
            validateAndParse(text);
        };
        reader.readAsText(file);
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
    };

    const validateAndParse = (text: string) => {
        if (!text.trim()) {
            setImportResult(null);
            return;
        }

        try {
            const result = parseJSONSchema(text, handleFieldClick, handleAddField);
            setImportResult(result);

            if (result.errors.length > 0) {
                toast.error(`Validation failed: ${result.errors.length} errors`);
            } else if (result.warnings.length > 0) {
                toast(`${result.warnings.length} warnings found`, { icon: '⚠️' });
            } else {
                toast.success(`Valid! Found ${result.nodes.length} masters`);
            }
        } catch (error) {
            setImportResult({
                nodes: [],
                edges: [],
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: [],
            });
        }
    };

    const handlePasteChange = (text: string) => {
        setJsonText(text);
        if (text.trim()) {
            validateAndParse(text);
        } else {
            setImportResult(null);
        }
    };

    const handleImport = () => {
        if (!importResult || importResult.errors.length > 0) {
            toast.error('Please fix errors before importing');
            return;
        }

        if (importResult.nodes.length === 0) {
            toast.error('No masters to import');
            return;
        }

        // Check for duplicates
        const { duplicates } = checkDuplicates(importResult.nodes, existingNodes);

        let nodesToImport = importResult.nodes;
        if (mergeMode && duplicates.length > 0) {
            if (skipDuplicates) {
                // Filter out duplicates
                const existingIds = new Set(existingNodes.map(n => n.id));
                nodesToImport = importResult.nodes.filter(n => !existingIds.has(n.id));

                if (nodesToImport.length === 0) {
                    toast.error('All masters already exist (duplicates skipped)');
                    return;
                }

                toast.success(`Importing ${nodesToImport.length} masters (${duplicates.length} duplicates skipped)`);
            }
        }

        onImport(nodesToImport, importResult.edges, mergeMode);
    };

    const hasErrors = importResult && importResult.errors.length > 0;
    const canImport = importResult && importResult.nodes.length > 0 && !hasErrors;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        📥 Import JSON Schema
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

                {/* Mode Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('upload')}
                            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${mode === 'upload'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            📁 Upload File
                        </button>
                        <button
                            onClick={() => setMode('paste')}
                            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${mode === 'paste'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            📋 Paste JSON
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {mode === 'upload' ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="text-6xl mb-4">📁</div>
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Drag & drop JSON file here
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                or click to browse
                            </p>
                        </div>
                    ) : (
                        <div>
                            <textarea
                                value={jsonText}
                                onChange={(e) => handlePasteChange(e.target.value)}
                                placeholder='Paste your JSON here...\n\n{\n  "masters": [\n    {\n      "name": "team_members",\n      "fields": [...]\n    }\n  ]\n}'
                                className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
                            />
                        </div>
                    )}

                    {/* Preview/Results */}
                    {importResult && (
                        <div className="space-y-3">
                            {/* Errors */}
                            {importResult.errors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                                        <span>❌</span> Errors ({importResult.errors.length})
                                    </h4>
                                    <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                                        {importResult.errors.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {importResult.warnings.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                                        <span>⚠️</span> Warnings ({importResult.warnings.length})
                                    </h4>
                                    <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                                        {importResult.warnings.map((warning, index) => (
                                            <li key={index}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Success Preview */}
                            {importResult.errors.length === 0 && importResult.nodes.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                        <span>✅</span> Ready to Import
                                    </h4>
                                    <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                                        <div>• {importResult.nodes.length} masters found</div>
                                        <div>• {importResult.edges.length} relationships found</div>
                                        <div className="mt-2 font-mono text-xs">
                                            Masters: {importResult.nodes.map(n => n.data.label).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Options */}
                    {importResult && importResult.nodes.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Import Options</h4>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={mergeMode}
                                        onChange={() => setMergeMode(true)}
                                        className="text-purple-600"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        Merge with existing masters
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        checked={!mergeMode}
                                        onChange={() => setMergeMode(false)}
                                        className="text-purple-600"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        Replace all (clear canvas)
                                    </span>
                                </label>

                                {mergeMode && (
                                    <label className="flex items-center gap-2 text-sm ml-6">
                                        <input
                                            type="checkbox"
                                            checked={skipDuplicates}
                                            onChange={(e) => setSkipDuplicates(e.target.checked)}
                                            className="text-purple-600"
                                        />
                                        <span className="text-gray-600 dark:text-gray-400">
                                            Skip duplicate master names
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {importResult && importResult.nodes.length > 0 && (
                            <span>{importResult.nodes.length} masters ready</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!canImport}
                            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            📥 Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

