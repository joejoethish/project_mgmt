import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Tag {
    tag_id: string;
    name: string;
    slug: string;
    color: string;
    category: string;
    description: string;
    is_system: boolean;
    is_active: boolean;
    usage_count?: number;
}

interface Category {
    category_id: string;
    name: string;
    label: string;
    icon: string;
}

export default function TagsList() {
    const navigate = useNavigate();
    const [tags, setTags] = useState<Tag[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const fetchData = async () => {
             try {
                 const [tagsRes, catsRes] = await Promise.all([
                     axios.get('http://192.168.1.26:8000/api/tags/tags/'),
                     axios.get('http://192.168.1.26:8000/api/tags/categories/')
                 ]);
                 setTags(tagsRes.data);
                 setCategories(catsRes.data);
             } catch {
                 toast.error('Failed to load data');
             } finally {
                 setLoading(false);
             }
        };
        fetchData();
    }, []);

    const fetchTags = async () => {
        try {
            const res = await axios.get('http://192.168.1.26:8000/api/tags/tags/');
            setTags(res.data);
        } catch {
            toast.error('Failed to load tags');
        }
    };

    const handleDelete = async (tag: Tag) => {
        if (tag.is_system) {
            toast.error('System tags cannot be deleted');
            return;
        }
        if (!confirm(`Delete tag "${tag.name}"?`)) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/tags/tags/${tag.tag_id}/`);
            toast.success('Tag deleted');
            fetchTags();
        } catch {
            toast.error('Failed to delete tag');
        }
    };

    const filteredTags = tags.filter(tag => {
        const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !filterCategory || tag.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category
    const tagsByCategory = filteredTags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {} as Record<string, Tag[]>);

    const getCategoryInfo = (catId: string) => categories.find(c => c.category_id === catId);

    if (loading) {
        return (
            <div className="p-6 animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                <div className="grid grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏷️ Tags</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage tags for filtering and reporting across all entities
                    </p>
                </div>
                <button
                    onClick={() => navigate('/tags/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition font-medium shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Tag
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {categories.map(cat => {
                    const count = tags.filter(t => t.category === cat.category_id).length;
                    return (
                        <button
                            key={cat.category_id}
                            onClick={() => setFilterCategory(filterCategory === cat.category_id ? '' : cat.category_id)}
                            className={`p-3 rounded-xl border transition ${
                                filterCategory === cat.category_id
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <div className="text-2xl">{cat.icon}</div>
                            <div className="font-semibold text-gray-900 dark:text-white">{count}</div>
                            <div className="text-xs text-gray-500">{cat.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search tags..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tags Display */}
            {viewMode === 'grid' ? (
                <div className="space-y-8">
                    {Object.entries(tagsByCategory).map(([catId, categoryTags]) => {
                        const cat = getCategoryInfo(catId);
                        // Skip if category id is not found (shouldn't happen unless deleted)
                        if (!cat) return null;
                        
                        return (
                        <div key={cat.category_id}>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <span>{cat.icon}</span>
                                {cat.label}
                                <span className="text-sm font-normal text-gray-500">({categoryTags.length})</span>
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {categoryTags.map(tag => (
                                    <div
                                        key={tag.tag_id}
                                        className="group relative flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition cursor-pointer"
                                        onClick={() => navigate(`/tags/${tag.tag_id}`)}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                                        {tag.is_system && (
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                                                System
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(tag); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Tag</th>
                                <th className="px-6 py-4 font-semibold">Category</th>
                                <th className="px-6 py-4 font-semibold">Color</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTags.map(tag => (
                                <tr key={tag.tag_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                            <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        <span className="mr-2">{tag.category_icon}</span>
                                        {tag.category_label}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs font-mono" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                            {tag.color}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tag.is_system ? (
                                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">System</span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Custom</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/tags/${tag.tag_id}`)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tag)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                disabled={tag.is_system}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="text-sm text-gray-500">
                Showing {filteredTags.length} of {tags.length} tags
            </div>
        </div>
    );
}

