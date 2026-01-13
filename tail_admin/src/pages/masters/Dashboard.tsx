import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { mastersApi } from '../../services/dynamicMasterApi';
import { DynamicMaster } from '../../types/dynamicMaster';
import ImportModal from '../../components/ImportModal';

export default function MastersDashboard() {
    const [masters, setMasters] = useState<DynamicMaster[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImport, setShowImport] = useState(false);

    useEffect(() => {
        loadMasters();
    }, []);

    const loadMasters = async () => {
        try {
            setLoading(true);
            const data = await mastersApi.listMasters();
            setMasters(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load masters');
            console.error('Error loading masters:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading masters...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Error: {error}</p>
                    <button
                        onClick={loadMasters}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Masters Management</h1>
                        <p className="mt-2 text-gray-600">
                            Manage your dynamic master data tables
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/masters/visual"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <span className="text-xl mr-2">🎨</span>
                            Visual Builder
                        </Link>
                        <Link
                            to="/masters/wizard"
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <span className="text-xl mr-2">🧙</span>
                            AI Wizard
                        </Link>
                        <Link
                            to="/masters/create"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <span className="text-xl mr-2">+</span>
                            Create New Master
                        </Link>
                        <button
                            onClick={() => setShowImport(true)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <span className="text-xl mr-2">📥</span>
                            Unified Import
                        </button>
                    </div>
                </div>
            </div>

            {/* Masters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {masters.map((master) => (
                    <div
                        key={master.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
                    >
                        {/* Icon and Title */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="text-4xl mr-3">{master.icon}</div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {master.display_name}
                                    </h3>
                                    <p className="text-sm text-gray-500">{master.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {master.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {master.description}
                            </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between py-3 border-t border-gray-100">
                            <div className="flex items-center space-x-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {master.record_count}
                                    </p>
                                    <p className="text-xs text-gray-500">Records</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {master.fields.length}
                                    </p>
                                    <p className="text-xs text-gray-500">Fields</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex space-x-2">
                            <Link
                                to={`/masters/${master.name}`}
                                className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                                Manage Data
                            </Link>
                            <Link
                                to={`/masters/${master.name}/edit`}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                Edit
                            </Link>
                        </div>

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            {master.is_searchable && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    🔍 Searchable
                                </span>
                            )}
                            {master.is_exportable && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    📤 Exportable
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {masters.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No Masters Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Get started by creating your first dynamic master table
                    </p>
                    <Link
                        to="/masters/create"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <span className="text-xl mr-2">+</span>
                        Create Your First Master
                    </Link>
                </div>
            )}

            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onSuccess={() => {
                    setShowImport(false);
                    // toast.success('Unified import complete');
                    loadMasters();
                }}
                title="Unified Data Import"
                importEndpoint="http://192.168.1.26:8000/api/pm/import/unified/"
                templateEndpoint="http://192.168.1.26:8000/api/pm/import/unified/"
                additionalData={{}}
            />
        </div>
    );
}

