import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface LeaveType {
    id: string;
    leave_code: string;
    leave_name: string;
    max_days_per_year: number;
    is_paid: boolean;
    carry_forward_allowed: boolean;
    max_carry_forward_days: number;
    description: string;
    is_active: boolean;
}

export default function LeaveTypeList() {
    const navigate = useNavigate();
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/hr/leave-types/')
            .then(res => setLeaveTypes(res.data))
            .catch(() => toast.error('Failed to load'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/hr/leave-types/${id}/`);
            toast.success('Deleted');
            setLeaveTypes(leaveTypes.filter(l => l.id !== id));
        } catch {
            toast.error('Failed');
        }
    };

    if (loading) {
        return <div className="p-6 animate-pulse"><div className="h-64 bg-gray-200 rounded"></div></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Types</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure leave categories and policies</p>
                </div>
                <button onClick={() => navigate('/hr/leave-types/new')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Leave Type
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveTypes.map(lt => (
                    <div key={lt.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lt.is_paid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{lt.leave_name}</h3>
                                    <p className="text-xs text-gray-500">{lt.leave_code}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${lt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {lt.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Days/Year:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{lt.max_days_per_year}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Type:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${lt.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {lt.is_paid ? 'Paid' : 'Unpaid'}
                                </span>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Carry Forward:</span>
                                <span>{lt.carry_forward_allowed ? `Yes (${lt.max_carry_forward_days} days)` : 'No'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => navigate(`/hr/leave-types/${lt.id}`)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                            <button onClick={() => handleDelete(lt.id, lt.leave_name)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {leaveTypes.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    No leave types configured. <button onClick={() => navigate('/hr/leave-types/new')} className="text-blue-600 hover:underline">Create one →</button>
                </div>
            )}
        </div>
    );
}

