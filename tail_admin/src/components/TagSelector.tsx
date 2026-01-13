import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Tag {
    tag_id: string;
    name: string;
    color: string;
    category: string; // ID
    category_label?: string;
    category_icon?: string;
}

interface TagSelectorProps {
    selectedTagIds: string[];
    onChange: (ids: string[]) => void;
    className?: string;
}

export default function TagSelector({ selectedTagIds, onChange, className = '' }: TagSelectorProps) {
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

    const removeTag = (tagId: string) => {
        onChange(selectedTagIds.filter(id => id !== tagId));
    };

    const selectedTagsList = tags.filter(t => selectedTagIds.includes(t.tag_id));
    
    // Filter available tags for dropdown
    const availableTags = tags.filter(t => 
        !selectedTagIds.includes(t.tag_id) && 
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group available tags by category
    const groupedTags = availableTags.reduce((acc, tag) => {
        const catLabel = tag.category_label || 'Uncategorized';
        if (!acc[catLabel]) acc[catLabel] = [];
        acc[catLabel].push(tag);
        return acc;
    }, {} as Record<string, Tag[]>);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
            </label>
            
            <div 
                className="flex flex-wrap gap-2 p-2 min-h-[42px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-text focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500"
                onClick={() => setIsOpen(true)}
            >
                {selectedTagsList.map(tag => (
                    <span 
                        key={tag.tag_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{ 
                            backgroundColor: tag.color + '15', 
                            color: tag.color,
                            borderColor: tag.color + '30'
                        }}
                    >
                        {tag.category_icon && <span className="mr-0.5">{tag.category_icon}</span>}
                        {tag.name}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(tag.tag_id); }}
                            className="ml-1 hover:text-red-500 focus:outline-none"
                        >
                            ×
                        </button>
                    </span>
                ))}
                
                <input
                    type="text"
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    placeholder={selectedTagsList.length === 0 ? "Select tags..." : ""}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                    {availableTags.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No matching tags found</div>
                    ) : (
                        Object.entries(groupedTags).map(([category, groupTags]) => (
                            <div key={category}>
                                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                                    {category}
                                </div>
                                {groupTags.map(tag => (
                                    <button
                                        key={tag.tag_id}
                                        type="button"
                                        onClick={() => { toggleTag(tag.tag_id); setSearchTerm(''); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-gray-700 flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                {tag.name}
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
            )}
        </div>
    );
}

