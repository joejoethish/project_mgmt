import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function LeaveTypeForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        leave_code: '',
        leave_name: '',
        max_days_per_year: 10,
        is_paid: true,
        carry_forward_allowed: false,
        max_carry_forward_days: 0,
        description: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) {
            axios.get(`http://192.168.1.26:8000/api/hr/leave-types/${id}/`)
                .then(res => setFormData({
                    leave_code: res.data.leave_code || '',
                    leave_name: res.data.leave_name || '',
                    max_days_per_year: res.data.max_days_per_year || 10,
                    is_paid: res.data.is_paid ?? true,
                    carry_forward_allowed: res.data.carry_forward_allowed ?? false,
                    max_carry_forward_days: res.data.max_carry_forward_days || 0,
                    description: res.data.description || '',
                    is_active: res.data.is_active ?? true
                }))
                .catch(() => toast.error('Failed to load'));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (id) await axios.put(`http://192.168.1.26:8000/api/hr/leave-types/${id}/`, formData);
            else await axios.post('http://192.168.1.26:8000/api/hr/leave-types/', formData);
            toast.success(isEdit ? 'Updated' : 'Created');
            navigate('/hr/leave-types');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <h1 className="text-xl font-bold text-white">{isEdit ? 'Edit' : 'New'} Leave Type</h1>
                    <p className="text-teal-100 text-sm mt-1">Configure leave policy details</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label>
                            <input type="text" required value={formData.leave_code} onChange={e => setFormData({ ...formData, leave_code: e.target.value })} placeholder="e.g., CL, SL, PL" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                            <input type="text" required value={formData.leave_name} onChange={e => setFormData({ ...formData, leave_name: e.target.value })} placeholder="e.g., Casual Leave" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Days per Year *</label>
                        <input type="number" min="1" required value={formData.max_days_per_year} onChange={e => setFormData({ ...formData, max_days_per_year: parseInt(e.target.value) })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
                    </div>

                    <div className="flex gap-6">
                        <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer flex-1">
                            <input type="checkbox" checked={formData.is_paid} onChange={e => setFormData({ ...formData, is_paid: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <div>
                                <span className="font-medium text-gray-900 dark:text-white">Paid Leave</span>
                                <p className="text-xs text-gray-500">Employee gets paid during this leave</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer flex-1">
                            <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <div>
                                <span className="font-medium text-gray-900 dark:text-white">Active</span>
                                <p className="text-xs text-gray-500">Leave type is available</p>
                            </div>
                        </label>
                    </div>

                    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <label className="flex items-center gap-3 mb-3">
                            <input type="checkbox" checked={formData.carry_forward_allowed} onChange={e => setFormData({ ...formData, carry_forward_allowed: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Allow Carry Forward</span>
                        </label>
                        {formData.carry_forward_allowed && (
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Max Carry Forward Days</label>
                                <input type="number" min="0" value={formData.max_carry_forward_days} onChange={e => setFormData({ ...formData, max_carry_forward_days: parseInt(e.target.value) })} className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Policy details..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={() => navigate('/hr/leave-types')} className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

