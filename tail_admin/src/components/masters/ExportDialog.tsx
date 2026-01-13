import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import toast from 'react-hot-toast';
import { generateExport, downloadFile, ExportFormat } from '../../utils/exportGenerators';

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    schemaName: string;
}

export default function ExportDialog({
    isOpen,
    onClose,
    nodes,
    edges,
    schemaName,
}: ExportDialogProps) {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
    const [exportContent, setExportContent] = useState('');

    if (!isOpen) return null;

    // Generate export when format changes
    const handleFormatChange = (format: ExportFormat) => {
        setSelectedFormat(format);
        try {
            const content = generateExport(format, nodes, edges);
            setExportContent(content);
        } catch (error) {
            console.error('Export generation failed:', error);
            toast.error('Failed to generate export');
            setExportContent('');
        }
    };

    // Initialize on first render
    if (!exportContent && nodes.length > 0) {
        const content = generateExport(selectedFormat, nodes, edges);
        setExportContent(content);
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportContent);
            toast.success('Copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy');
        }
    };

    const handleDownload = () => {
        try {
            downloadFile(exportContent, schemaName || 'schema', selectedFormat);
            toast.success('File downloaded!');
        } catch (error) {
            toast.error('Failed to download');
        }
    };

    const formats: { value: ExportFormat; label: string; icon: string }[] = [
        { value: 'json', label: 'JSON', icon: '📋' },
        { value: 'sql', label: 'SQL DDL', icon: '🗄️' },
        { value: 'django', label: 'Django', icon: '🐍' },
        { value: 'sqlalchemy', label: 'SQLAlchemy', icon: '⚙️' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        📤 Export Schema
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

                {/* Format Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                    <div className="flex gap-2">
                        {formats.map(format => (
                            <button
                                key={format.value}
                                onClick={() => handleFormatChange(format.value)}
                                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${selectedFormat === format.value
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                <span className="mr-2">{format.icon}</span>
                                {format.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-hidden p-6">
                    <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-auto">
                        <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {exportContent || 'No content to export'}
                        </pre>
                    </div>
                </div>

                {/* Info */}
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-b border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
                        <span className="text-blue-800 dark:text-blue-300">
                            {selectedFormat === 'json' && 'Portable schema format for sharing and backup'}
                            {selectedFormat === 'sql' && 'PostgreSQL-compatible CREATE TABLE statements'}
                            {selectedFormat === 'django' && 'Ready-to-use Django ORM models'}
                            {selectedFormat === 'sqlalchemy' && 'SQLAlchemy declarative models'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div className="text-sm text-gray-500">
                        {nodes.length} tables, {edges.length} relationships
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        >
                            📋 Copy to Clipboard
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                            💾 Download File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

