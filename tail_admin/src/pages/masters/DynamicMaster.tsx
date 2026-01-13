import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { mastersApi, dynamicDataApi } from '../../services/dynamicMasterApi';
import { DynamicMaster, DynamicMasterData } from '../../types/dynamicMaster';

export default function DynamicMasterPage() {
    const { masterName } = useParams<{ masterName: string }>();
    const [master, setMaster] = useState<DynamicMaster | null>(null);
    const [data, setData] = useState<DynamicMasterData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DynamicMasterData | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [searchQuery, setSearchQuery] = useState('');
    
    // Import state
    const [showImport, setShowImport] = useState(false);
    const [importData, setImportData] = useState<Record<string, any>[]>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (masterName) {
            loadMasterAndData();
        }
    }, [masterName]);

    const loadMasterAndData = async () => {
        try {
            setLoading(true);
            // Get all masters and find ours
            const masters = await mastersApi.listMasters();
            const foundMaster = masters.find(m => m.name === masterName);

            if (!foundMaster) {
                setError('Master not found');
                return;
            }

            setMaster(foundMaster);

            // Load data
            const records = await dynamicDataApi.listData(masterName!);
            setData(records);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadMasterAndData();
            return;
        }

        try {
            const results = await dynamicDataApi.searchData(masterName!, searchQuery);
            setData(results);
        } catch (err: any) {
            setError(err.message || 'Search failed');
        }
    };

    const handleCreate = () => {
        setEditingRecord(null);
        setFormData({});
        setShowForm(true);
    };

    const handleEdit = (record: DynamicMasterData) => {
        setEditingRecord(record);
        setFormData(record.data);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await dynamicDataApi.deleteData(masterName!, id);
            loadMasterAndData();
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingRecord) {
                await dynamicDataApi.updateData(masterName!, editingRecord.id, { data: formData });
            } else {
                await dynamicDataApi.createData(masterName!, { data: formData });
            }

            setShowForm(false);
            loadMasterAndData();
        } catch (err: any) {
            alert('Failed to save: ' + (err.response?.data?.data || err.message));
        }
    };

    // Import handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                let records: Record<string, any>[] = [];

                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    records = Array.isArray(parsed) ? parsed : [parsed];
                } else if (file.name.endsWith('.csv')) {
                    // Parse CSV
                    const lines = content.split('\n').filter(l => l.trim());
                    if (lines.length < 2) {
                        setImportError('CSV must have header row and at least one data row');
                        return;
                    }
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    records = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                        const obj: Record<string, any> = {};
                        headers.forEach((h, i) => {
                            obj[h] = values[i] || '';
                        });
                        return obj;
                    });
                } else {
                    setImportError('Please upload a .json or .csv file');
                    return;
                }

                setImportData(records);
                setImportError(null);
            } catch (err: any) {
                setImportError('Failed to parse file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (importData.length === 0) return;
        setImporting(true);
        try {
            const result = await dynamicDataApi.bulkCreate(masterName!, { records: importData });
            alert(`Import complete! Created: ${result.created}, Failed: ${result.failed}`);
            if (result.created > 0) {
                setShowImport(false);
                setImportData([]);
                loadMasterAndData();
            }
        } catch (err: any) {
            setImportError('Import failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        if (!master) return;
        const fields = master.fields.filter(f => f.show_in_form).map(f => f.field_name);
        const csv = fields.join(',') + '\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${masterName}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (error || !master) {
        return <div className="p-6 text-red-600">Error: {error}</div>;
    }

    const listFields = master.fields.filter(f => f.show_in_list);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center">
                    <Link to="/masters" className="text-blue-600 hover:text-blue-800 mr-4">
                        ← Back to Masters
                    </Link>
                    <div className="text-3xl mr-3">{master.icon}</div>
                    <div>
                        <h1 className="text-2xl font-bold">{master.display_name}</h1>
                        <p className="text-gray-600">{data.length} records</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import
                    </button>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        + Add New
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button
                    onClick={handleSearch}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    Search
                </button>
                {searchQuery && (
                    <button
                        onClick={() => { setSearchQuery(''); loadMasterAndData(); }}
                        className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {listFields.map((field) => (
                                <th key={field.field_name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    {field.display_name}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                                {listFields.map((field) => (
                                    <td key={field.field_name} className="px-6 py-4 text-sm text-gray-900">
                                        {String(record.data[field.field_name] || '-')}
                                    </td>
                                ))}
                                <td className="px-6 py-4 text-right text-sm space-x-2">
                                    <button
                                        onClick={() => handleEdit(record)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(record.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {data.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No records found</p>
                        <button
                            onClick={handleCreate}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add First Record
                        </button>
                    </div>
                )}
            </div>

            {/* Form Modal - Enhanced Design */}
            {showForm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-40 animate-fadeIn"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingRecord ? 'Edit' : 'Add'} {master.display_name}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-6">
                                {master.fields.filter(f => f.show_in_form).map((field) => (
                                    <div key={field.field_name} className={field.field_type === 'textarea' ? 'col-span-2' : ''}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {field.display_name}
                                            {field.is_required && <span className="text-red-600 ml-1">*</span>}
                                        </label>

                                        {field.field_type === 'textarea' ? (
                                            <textarea
                                                value={formData[field.field_name] || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                                required={field.is_required}
                                                placeholder={field.placeholder}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                rows={3}
                                            />
                                        ) : field.field_type === 'select' ? (
                                            <select
                                                value={formData[field.field_name] || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                                required={field.is_required}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">Select...</option>
                                                {field.choices_json?.map((choice) => (
                                                    <option key={choice} value={choice}>{choice}</option>
                                                ))}
                                            </select>
                                        ) : field.field_type === 'boolean' ? (
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData[field.field_name] || false}
                                                    onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.checked })}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'date' ? 'date' : field.field_type === 'datetime' ? 'datetime-local' : 'text'}
                                                value={formData[field.field_name] || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                                                required={field.is_required}
                                                placeholder={field.placeholder}
                                                maxLength={field.max_length}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        )}

                                        {field.help_text && (
                                            <p className="text-xs text-gray-500 mt-1.5 italic">{field.help_text}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                                >
                                    {editingRecord ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-40"
                    onClick={() => setShowImport(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                Import {master.display_name}
                            </h2>
                            <button
                                onClick={() => setShowImport(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* File Upload */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv,.json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Choose CSV or JSON File
                                </button>
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Template
                                </button>
                            </div>

                            {importError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg mb-4">
                                    {importError}
                                </div>
                            )}
                        </div>

                        {/* Preview */}
                        {importData.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3">
                                    Preview ({importData.length} records)
                                </h3>
                                <div className="border rounded-lg overflow-x-auto max-h-64">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {Object.keys(importData[0] || {}).map((key) => (
                                                    <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {importData.slice(0, 10).map((row, idx) => (
                                                <tr key={idx}>
                                                    {Object.values(row).map((val, i) => (
                                                        <td key={i} className="px-4 py-2 text-gray-900 truncate max-w-xs">
                                                            {String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importData.length > 10 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Showing 10 of {importData.length} records
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowImport(false); setImportData([]); }}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importData.length === 0 || importing}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {importing ? 'Importing...' : `Import ${importData.length} Records`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


