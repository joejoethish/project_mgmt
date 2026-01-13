import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Tag {
    tag_id: string;
    name: string;
    color: string;
    category: string;
    category_label?: string;
    category_icon?: string;
}

interface TagFilterProps {
    selectedTagIds: string[];
    onChange: (ids: string[]) => void;
}

export default function TagFilter({ selectedTagIds, onChange }: TagFilterProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/tags/tags/')
            .then(res => setTags(res.data))
            .catch(err => console.error("Failed to load tags", err));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTag = (tagId: string) => {
        const newSelected = selectedTagIds.includes(tagId)
            ? selectedTagIds.filter(id => id !== tagId)
            : [...selectedTagIds, tagId];
        onChange(newSelected);
    };

    const clearTags = () => onChange([]);

    const availableTags = tags.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Group available tags by category
    const groupedTags = availableTags.reduce((acc, tag) => {
        const catLabel = tag.category_label || 'Uncategorized';
        if (!acc[catLabel]) acc[catLabel] = [];
        acc[catLabel].push(tag);
        return acc;
    }, {} as Record<string, Tag[]>);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                    selectedTagIds.length > 0
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                }`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tags
                {selectedTagIds.length > 0 && (
                    <span className="flex items-center justify-center bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100 text-xs rounded-full w-5 h-5">
                        {selectedTagIds.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                        />
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                        {availableTags.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">No tags found</div>
                        ) : (
                            Object.entries(groupedTags).map(([category, groupTags]) => (
                                <div key={category}>
                                    <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                                        {category}
                                    </div>
                                    {groupTags.map(tag => (
                                        <button
                                            key={tag.tag_id}
                                            onClick={() => toggleTag(tag.tag_id)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                                    selectedTagIds.includes(tag.tag_id)
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {selectedTagIds.includes(tag.tag_id) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span className="flex items-center gap-2">
                                                     <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                     <span className="text-gray-900 dark:text-gray-100">{tag.name}</span>
                                                </span>
                                            </div>
                                            {tag.category_icon && (
                                                <span className="text-gray-400 text-xs">{tag.category_icon}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {selectedTagIds.length > 0 && (
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button
                                onClick={clearTags}
                                className="w-full py-1 text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

