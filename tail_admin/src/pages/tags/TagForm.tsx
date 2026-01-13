import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';



const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#64748b', '#374151', '#1f2937',
];

interface Category {
    category_id: string;
    name: string;
    label: string;
    icon: string;
    color: string;
}

export default function TagForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        category: '', // This will store category_id now
        color: '#6366f1',
        description: '',
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Fetch categories first
        axios.get('http://192.168.1.26:8000/api/tags/categories/')
            .then(res => {
                setCategories(res.data);
                if (!isEdit && res.data.length > 0) {
                     // Set default category to 'custom' or first one
                     const defaultCat = res.data.find((c: Category) => c.name === 'custom') || res.data[0];
                     setFormData(prev => ({ ...prev, category: defaultCat.category_id }));
                }
            })
            .catch(() => toast.error('Failed to load categories'));

        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/tags/tags/${id}/`)
                .then(res => setFormData(res.data))
                .catch(() => toast.error('Failed to load tag'))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        
        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            // Auto-generate slug from name
            if (name === 'name') {
                updated.slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/tags/tags/${id}/`, formData);
                toast.success('Tag updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/tags/tags/', formData);
                toast.success('Tag created');
            }
            navigate('/tags');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { slug?: string[] } } };
            toast.error(error.response?.data?.slug?.[0] || 'Failed to save tag');
        } finally {
            setSaving(false);
        }
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
        <div className="p-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/tags')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Tags
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isEdit ? 'Edit Tag' : 'Create New Tag'}
                </h1>
            </div>

            {/* Preview */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 mb-2">Preview</div>
                <div className="flex items-center gap-3">
                    <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
                        style={{ 
                            borderColor: formData.color,
                            backgroundColor: formData.color + '15'
                        }}
                    >
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: formData.color }}
                        />
                        <span className="font-medium" style={{ color: formData.color }}>
                            {formData.name || 'Tag Name'}
                        </span>
                    </span>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tag Name *
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="e.g. High Priority"
                    />
                </div>

                {/* Slug (auto-generated) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Slug (URL-friendly name)
                    </label>
                    <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                        placeholder="high-priority"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.category_id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, category: cat.category_id }))}
                                className={`p-3 rounded-lg border text-center transition ${
                                    formData.category === cat.category_id
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <div className="text-xl">{cat.icon}</div>
                                <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">{cat.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, color }))}
                                className={`w-8 h-8 rounded-full border-2 transition ${
                                    formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            className="w-12 h-12 rounded cursor-pointer"
                        />
                        <input
                            type="text"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono uppercase w-32"
                            placeholder="#6366f1"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (optional)
                    </label>
                    <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="What is this tag used for?"
                    />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 rounded text-indigo-600"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                        Active (visible in tag selectors)
                    </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (isEdit ? 'Update Tag' : 'Create Tag')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/tags')}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

