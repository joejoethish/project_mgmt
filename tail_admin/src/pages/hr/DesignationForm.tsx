import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function DesignationForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        designation_code: '',
        designation_name: '',
        level: 1,
        min_salary: '',
        max_salary: '',
        description: '',
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) {
            axios.get(`http://192.168.1.26:8000/api/hr/designations/${id}/`)
                .then(res => setFormData({
                    designation_code: res.data.designation_code || '',
                    designation_name: res.data.designation_name || '',
                    level: res.data.level || 1,
                    min_salary: res.data.min_salary || '',
                    max_salary: res.data.max_salary || '',
                    description: res.data.description || '',
                    is_active: res.data.is_active ?? true
                }))
                .catch(() => toast.error('Failed to load'));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            ...formData,
            min_salary: formData.min_salary || null,
            max_salary: formData.max_salary || null,
            description: formData.description || null
        };
        try {
            if (id) await axios.put(`http://192.168.1.26:8000/api/hr/designations/${id}/`, payload);
            else await axios.post('http://192.168.1.26:8000/api/hr/designations/', payload);
            toast.success(isEdit ? 'Updated' : 'Created');
            navigate('/hr/designations');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-600 to-purple-600">
                    <h1 className="text-xl font-bold text-white">{isEdit ? 'Edit' : 'New'} Designation</h1>
                    <p className="text-violet-100 text-sm mt-1">Define a job title and career level</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label>
                            <input type="text" required value={formData.designation_code} onChange={e => setFormData({ ...formData, designation_code: e.target.value })} placeholder="e.g., SE, SSE, TL" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                            <input type="text" required value={formData.designation_name} onChange={e => setFormData({ ...formData, designation_name: e.target.value })} placeholder="e.g., Software Engineer" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level (1=Entry, 10=Executive) *</label>
                        <input type="range" min="1" max="10" value={formData.level} onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Entry (1)</span>
                            <span className="font-bold text-violet-600 text-lg">Level {formData.level}</span>
                            <span>Executive (10)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Salary</label>
                            <input type="number" value={formData.min_salary} onChange={e => setFormData({ ...formData, min_salary: e.target.value })} placeholder="₹0" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Salary</label>
                            <input type="number" value={formData.max_salary} onChange={e => setFormData({ ...formData, max_salary: e.target.value })} placeholder="₹0" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500" />
                    </div>

                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded text-violet-600" />
                        <span className="text-gray-700 dark:text-gray-300">Active</span>
                    </label>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={() => navigate('/hr/designations')} className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition disabled:opacity-50">{saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

