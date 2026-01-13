import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Iteration {
    iteration_id: string;
    name: string;
    description: string;
    goal: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_current: boolean;
    task_count: number;
    total_points: number;
}

export default function IterationsList() {
    const navigate = useNavigate();
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/pm/iterations/')
            .then(res => setIterations(res.data))
            .catch(() => toast.error('Failed to load iterations'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this iteration?')) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/pm/iterations/${id}/`);
            setIterations(iterations.filter(i => i.iteration_id !== id));
            toast.success('Iteration deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    if (loading) {
        return (
            <div className="p-6 animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Iterations</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Bi-weekly planning cycles across all projects
                    </p>
                </div>
                <button
                    onClick={() => navigate('/pm/iterations/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Iteration
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl text-white">
                    <p className="text-indigo-100 text-sm">Total Iterations</p>
                    <p className="text-3xl font-bold mt-1">{iterations.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-xl text-white">
                    <p className="text-green-100 text-sm">Active</p>
                    <p className="text-3xl font-bold mt-1">{iterations.filter(i => i.is_active).length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-5 rounded-xl text-white">
                    <p className="text-blue-100 text-sm">Current Iteration</p>
                    <p className="text-xl font-bold mt-1">{iterations.find(i => i.is_current)?.name || 'None'}</p>
                </div>
            </div>

            {/* Iterations Grid */}
            {iterations.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No iterations yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first iteration to start planning</p>
                    <button
                        onClick={() => navigate('/pm/iterations/new')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Create First Iteration
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {iterations.map(iteration => (
                        <div
                            key={iteration.iteration_id}
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${iteration.is_current ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-700'} overflow-hidden hover:shadow-md transition cursor-pointer`}
                            onClick={() => navigate(`/pm/iterations/${iteration.iteration_id}`)}
                        >
                            <div className={`px-5 py-4 ${iteration.is_current ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{iteration.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {formatDateRange(iteration.start_date, iteration.end_date)}
                                        </p>
                                    </div>
                                    {iteration.is_current && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            Current
                                        </span>
                                    )}
                                </div>
                                {iteration.goal && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
                                        {iteration.goal}
                                    </p>
                                )}
                            </div>
                            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex gap-4 text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        <strong className="text-gray-900 dark:text-white">{iteration.task_count}</strong> tasks
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        <strong className="text-gray-900 dark:text-white">{iteration.total_points}</strong> pts
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(iteration.iteration_id); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

