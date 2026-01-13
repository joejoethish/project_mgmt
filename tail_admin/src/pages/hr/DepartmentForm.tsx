import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Department {
    id: string;
    dept_name: string;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
}

export default function DepartmentForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        dept_code: '',
        dept_name: '',
        category: 'other',
        parent_dept: '',
        head: '',
        cost_center: '',
        description: '',
        is_active: true
    });

    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            axios.get('http://192.168.1.26:8000/api/hr/departments/'),
            axios.get('http://192.168.1.26:8000/api/hr/employees/?status=active')
        ]).then(([deptRes, empRes]) => {
            setDepartments(deptRes.data.filter((d: Department) => d.id !== id));
            setEmployees(empRes.data);
        });

        if (id) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/hr/departments/${id}/`)
                .then(res => {
                    setFormData({
                        dept_code: res.data.dept_code || '',
                        dept_name: res.data.dept_name || '',
                        category: res.data.category || 'other',
                        parent_dept: res.data.parent_dept || '',
                        head: res.data.head || '',
                        cost_center: res.data.cost_center || '',
                        description: res.data.description || '',
                        is_active: res.data.is_active ?? true
                    });
                })
                .catch(() => toast.error('Failed to load'))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...formData,
            parent_dept: formData.parent_dept || null,
            head: formData.head || null,
            cost_center: formData.cost_center || null,
            description: formData.description || null
        };

        try {
            if (id) {
                await axios.put(`http://192.168.1.26:8000/api/hr/departments/${id}/`, payload);
                toast.success('Department updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/hr/departments/', payload);
                toast.success('Department created');
            }
            navigate('/hr/departments');
        } catch (error: any) {
            const msg = error.response?.data;
            if (typeof msg === 'object') {
                toast.error(Object.entries(msg).map(([k, v]) => `${k}: ${v}`).join(', '));
            } else {
                toast.error('Failed to save');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 animate-pulse"><div className="h-8 bg-gray-200 rounded w-48"></div></div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <h1 className="text-xl font-bold text-white">
                        {isEdit ? 'Edit Department' : 'New Department'}
                    </h1>
                    <p className="text-emerald-100 text-sm mt-1">
                        {isEdit ? 'Update department details' : 'Create a new organizational unit'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.dept_code}
                                onChange={e => setFormData({ ...formData, dept_code: e.target.value })}
                                placeholder="e.g., DEV, QA, IMPL"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.dept_name}
                                onChange={e => setFormData({ ...formData, dept_name: e.target.value })}
                                placeholder="e.g., Software Development"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { value: 'development', label: 'Development', color: 'blue' },
                                { value: 'qa', label: 'QA', color: 'purple' },
                                { value: 'implementation', label: 'Implementation', color: 'emerald' },
                                { value: 'support', label: 'Support', color: 'amber' },
                                { value: 'management', label: 'Management', color: 'rose' },
                                { value: 'hr', label: 'HR', color: 'pink' },
                                { value: 'finance', label: 'Finance', color: 'cyan' },
                                { value: 'other', label: 'Other', color: 'gray' },
                            ].map(cat => (
                                <label
                                    key={cat.value}
                                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                                        formData.category === cat.value
                                            ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20`
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat.value}
                                        checked={formData.category === cat.value}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="sr-only"
                                    />
                                    <span className={`text-sm font-medium ${formData.category === cat.value ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {cat.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Parent & Head */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Parent Department
                            </label>
                            <select
                                value={formData.parent_dept}
                                onChange={e => setFormData({ ...formData, parent_dept: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">No Parent (Top Level)</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.dept_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department Head
                            </label>
                            <select
                                value={formData.head}
                                onChange={e => setFormData({ ...formData, head: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Select Head</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Cost Center & Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cost Center
                            </label>
                            <input
                                type="text"
                                value={formData.cost_center}
                                onChange={e => setFormData({ ...formData, cost_center: e.target.value })}
                                placeholder="e.g., CC-001"
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Brief description of this department's responsibilities..."
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate('/hr/departments')}
                            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isEdit ? 'Update' : 'Create'} Department
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

