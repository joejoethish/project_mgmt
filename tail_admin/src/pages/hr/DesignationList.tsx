import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Designation {
    id: string;
    designation_code: string;
    designation_name: string;
    level: number;
    min_salary: number;
    max_salary: number;
    description: string;
    employee_count: number;
    is_active: boolean;
}

export default function DesignationList() {
    const navigate = useNavigate();
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/hr/designations/')
            .then(res => setDesignations(res.data))
            .catch(() => toast.error('Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/hr/designations/${id}/`);
            toast.success('Deleted');
            setDesignations(designations.filter(d => d.id !== id));
        } catch {
            toast.error('Cannot delete - has employees');
        }
    };

    const getLevelBadge = (level: number) => {
        if (level >= 8) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        if (level >= 5) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        if (level >= 3) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Designations</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Job titles and career levels</p>
                </div>
                <button
                    onClick={() => navigate('/hr/designations/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Designation
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Designation</th>
                            <th className="px-6 py-4 font-semibold">Level</th>
                            <th className="px-6 py-4 font-semibold">Salary Range</th>
                            <th className="px-6 py-4 font-semibold">Employees</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {designations.map(d => (
                            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 dark:text-white">{d.designation_name}</div>
                                    <div className="text-xs text-gray-500">{d.designation_code}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getLevelBadge(d.level)}`}>
                                        Level {d.level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                    {d.min_salary && d.max_salary
                                        ? `₹${d.min_salary.toLocaleString()} - ₹${d.max_salary.toLocaleString()}`
                                        : '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{d.employee_count || 0}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {d.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => navigate(`/hr/designations/${d.id}`)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(d.id, d.designation_name)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {designations.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                    No designations found. <button onClick={() => navigate('/hr/designations/new')} className="text-blue-600 hover:underline">Create one →</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

