import { useState, useRef } from 'react';
import { Modal } from './ui/modal';
import axios from 'axios';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title: string;
    importEndpoint: string;
    templateEndpoint: string;
    additionalData?: Record<string, string>;
}

export default function ImportModal({
    isOpen,
    onClose,
    onSuccess,
    title,
    importEndpoint,
    templateEndpoint,
    additionalData = {}
}: ImportModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ created: number; failed: number; errors?: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setResult(null);
            setError(null);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setImporting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Add any additional data
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });

        try {
            const response = await axios.post(importEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);
            if (response.data.created > 0) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open(templateEndpoint, '_blank');
    };

    const handleClose = () => {
        setSelectedFile(null);
        setResult(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            className="max-w-lg p-0 bg-transparent shadow-none"
            showCloseButton={false}
            closeOnOverlayClick={false}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* File Upload Area */}
                <div className="mb-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {selectedFile ? (
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Click to upload <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file
                                </p>
                                <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Template Download */}
                <div className="mb-6 flex justify-center">
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className={`mb-4 p-4 rounded-lg ${result.created > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                        <div className="flex items-center gap-3">
                            {result.created > 0 ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {result.created} records imported
                                </p>
                                {result.failed > 0 && (
                                    <p className="text-sm text-red-600">{result.failed} failed</p>
                                )}
                            </div>
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                                <p className="font-medium mb-1">Errors:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {result.errors.slice(0, 5).map((err, idx) => (
                                        <li key={idx}>Row {err.row}: {err.error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
                    >
                        {result?.created ? 'Close' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!selectedFile || importing}
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition flex items-center justify-center gap-2"
                    >
                        {importing ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Importing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

