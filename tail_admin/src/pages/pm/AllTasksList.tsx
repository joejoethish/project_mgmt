import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdvancedTable, { AdvancedTableColumn, RowAction } from '../../components/tables/AdvancedTable';
import TagFilter from '../../components/TagFilter';

interface Task {
    [key: string]: unknown; // Index signature for AdvancedTable compatibility
    task_id: string;
    title: string;
    description: string;
    status_id: string;
    status_name: string;
    priority_id: string;
    priority_name: string;
    assigned_to: string;
    assignee_name: string;
    project_id: string;
    project_name: string;
    due_date: string;
    created_at: string;
    external_url?: string;
    tags?: {
        tag_id: string;
        name: string;
        color: string;
    }[];
}

interface TaskStatus {
    task_status_id: string;
    name: string;
}

interface Project {
    project_id: string;
    name: string;
}

export default function AllTasksList() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    
    // Server-side pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Fetch reference data once
    useEffect(() => {
        Promise.all([
            axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/'),
            axios.get('http://192.168.1.26:8000/api/pm/projects/')
        ])
            .then(([statusesRes, projectsRes]) => {
                setStatuses(statusesRes.data);
                setProjects(projectsRes.data);
            })
            .catch(() => toast.error('Failed to load reference data'));
    }, []);

    // Fetch tasks with server-side pagination
    const fetchTasks = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('page_size', String(pageSize));
        
        if (filterStatus) params.set('status_id', filterStatus);
        if (filterProject) params.set('project_id', filterProject);
        if (filterTags.length) params.set('tags', filterTags.join(','));

        axios.get(`http://192.168.1.26:8000/api/pm/tasks/?${params.toString()}`)
            .then(res => {
                setTasks(res.data.results || res.data);
                setTotalCount(res.data.count || res.data.length);
            })
            .catch(() => toast.error('Failed to load tasks'))
            .finally(() => setLoading(false));
    }, [currentPage, pageSize, filterStatus, filterProject, filterTags]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterProject, filterTags]);

    // Status color helper
    const getStatusColor = (statusName: string) => {
        const colors: Record<string, string> = {
            'Backlogs': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            'To Do': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            'In Review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'Yet to Update in Test': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            'Yet to Update in Live': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
            'Approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            'Completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            'Rejected - Dev': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            'Rejected - Sup': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        };
        return colors[statusName] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    };

    // Priority badge helper
    const getPriorityBadge = (priorityName: string | undefined) => {
        if (!priorityName) return null;
        const colors: Record<string, string> = {
            'Critical': 'text-red-600',
            'High': 'text-orange-500',
            'Medium': 'text-yellow-500',
            'Low': 'text-green-500',
        };
        const icons: Record<string, string> = {
            'Critical': '🔴',
            'High': '🟠',
            'Medium': '🟡',
            'Low': '🟢',
        };
        return (
            <span className={`flex items-center gap-1 ${colors[priorityName] || ''}`}>
                <span>{icons[priorityName] || '⚪'}</span>
                <span className="text-xs">{priorityName}</span>
            </span>
        );
    };

    // Table columns definition
    const columns: AdvancedTableColumn<Task>[] = [
        {
            key: 'title',
            header: 'Task',
            sortable: true,
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">{row.title}</div>
                    {row.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{row.description}</div>
                    )}
                    {row.external_url && (
                        <a
                            href={row.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded text-[10px] font-bold shadow-sm hover:from-orange-600 hover:to-red-600 transition"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <text x="5" y="16" fontSize="12" fontWeight="bold">Z</text>
                            </svg>
                            Zoho
                        </a>
                    )}
                </div>
            ),
        },
        {
            key: 'project_name',
            header: 'Project',
            sortable: true,
            render: (value) => (
                <span className="text-gray-600 dark:text-gray-400">{value as string || '-'}</span>
            ),
        },
        {
            key: 'status_name',
            header: 'Status',
            sortable: true,
            render: (value) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(value as string)}`}>
                    {value as string || '-'}
                </span>
            ),
        },
        {
            key: 'priority_name',
            header: 'Priority',
            sortable: true,
            render: (value) => getPriorityBadge(value as string),
        },
        {
            key: 'assignee_name',
            header: 'Assignee',
            sortable: true,
            render: (value) => {
                const name = value as string;
                if (!name) return <span className="text-gray-400 italic">Unassigned</span>;
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs flex items-center justify-center font-medium">
                            {initials}
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{name}</span>
                    </div>
                );
            },
        },
        {
            key: 'due_date',
            header: 'Due Date',
            sortable: true,
            render: (value) => {
                if (!value) return <span className="text-gray-400">-</span>;
                const date = new Date(value as string);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(date);
                dueDate.setHours(0, 0, 0, 0);
                
                const isOverdue = dueDate < today;
                const isToday = dueDate.getTime() === today.getTime();
                const isTomorrow = dueDate.getTime() === today.getTime() + 86400000;
                
                let label = date.toLocaleDateString();
                let className = 'text-gray-600 dark:text-gray-400';
                
                if (isOverdue) {
                    className = 'text-red-600 font-medium';
                    label = `Overdue (${date.toLocaleDateString()})`;
                } else if (isToday) {
                    className = 'text-orange-600 font-medium';
                    label = 'Today';
                } else if (isTomorrow) {
                    className = 'text-yellow-600 font-medium';
                    label = 'Tomorrow';
                }
                
                return <span className={className}>{label}</span>;
            },
        },
    ];

    // Row actions
    const rowActions: RowAction<Task>[] = [
        {
            label: 'Edit',
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
            onClick: (row) => navigate(`/pm/projects/${row.project_id}/tasks/${row.task_id}`),
        },
    ];

    return (
        <div className="p-4 space-y-3">
            {/* Compact Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Title + Count */}
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                        {totalCount}
                    </span>
                </div>
                
                {/* Actions Row */}
                <div className="flex items-center gap-2">
                    {/* Filters */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(status => (
                            <option key={status.task_status_id} value={status.task_status_id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm max-w-[140px]"
                    >
                        <option value="">All Projects</option>
                        {projects.map(project => (
                            <option key={project.project_id} value={project.project_id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <TagFilter
                        selectedTagIds={filterTags}
                        onChange={setFilterTags}
                    />
                    
                    {/* View Toggle */}
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden ml-2">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 ${viewMode === 'table' 
                                ? 'bg-brand-500 text-white' 
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            title="Table View"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 ${viewMode === 'cards' 
                                ? 'bg-brand-500 text-white' 
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            title="Card View"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* New Task Button */}
                    {projects.length > 0 && (
                        <button
                            onClick={() => navigate(`/pm/projects/${projects[0].project_id}/tasks/new`)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filter Presets - Compact */}
            <div className="flex flex-wrap gap-1.5 items-center">
                <button
                    onClick={() => { setFilterStatus(''); setFilterProject(''); setFilterTags([]); }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        !filterStatus && !filterProject && filterTags.length === 0
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => {
                        const s = statuses.find(s => s.name.toLowerCase().includes('progress'));
                        if (s) setFilterStatus(s.task_status_id);
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        statuses.find(s => s.name.toLowerCase().includes('progress'))?.task_status_id === filterStatus
                            ? 'bg-yellow-500 text-white'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100'
                    }`}
                >
                    ⏳ Progress
                </button>
                <button
                    onClick={() => {
                        const s = statuses.find(s => s.name.toLowerCase().includes('completed') || s.name.toLowerCase().includes('approved'));
                        if (s) setFilterStatus(s.task_status_id);
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        statuses.find(s => s.name.toLowerCase().includes('completed') || s.name.toLowerCase().includes('approved'))?.task_status_id === filterStatus
                            ? 'bg-green-500 text-white'
                            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100'
                    }`}
                >
                    ✅ Done
                </button>
                <button
                    onClick={() => {
                        const s = statuses.find(s => s.name.toLowerCase().includes('review'));
                        if (s) setFilterStatus(s.task_status_id);
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        statuses.find(s => s.name.toLowerCase().includes('review'))?.task_status_id === filterStatus
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                    }`}
                >
                    👁️ Review
                </button>
                <button
                    onClick={() => {
                        const s = statuses.find(s => s.name.toLowerCase().includes('backlog') || s.name.toLowerCase() === 'open');
                        if (s) setFilterStatus(s.task_status_id);
                    }}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        statuses.find(s => s.name.toLowerCase().includes('backlog') || s.name.toLowerCase() === 'open')?.task_status_id === filterStatus
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                >
                    📥 Open
                </button>

                {/* Active filter indicator */}
                {(filterStatus || filterProject || filterTags.length > 0) && (
                    <button
                        onClick={() => { setFilterStatus(''); setFilterProject(''); setFilterTags([]); }}
                        className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Active Filter Badges */}
            {(filterStatus || filterProject || filterTags.length > 0) && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active filters:</span>
                    
                    {filterStatus && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                            </svg>
                            {statuses.find(s => s.task_status_id === filterStatus)?.name}
                            <button
                                onClick={() => setFilterStatus('')}
                                className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    )}
                    
                    {filterProject && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            {projects.find(p => p.project_id === filterProject)?.name}
                            <button
                                onClick={() => setFilterProject('')}
                                className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    )}
                    
                    {filterTags.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {filterTags.length} tag{filterTags.length > 1 ? 's' : ''}
                            <button
                                onClick={() => setFilterTags([])}
                                className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-100"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    )}
                    
                    <button
                        onClick={() => { setFilterStatus(''); setFilterProject(''); setFilterTags([]); }}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline ml-2"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* View Content */}
            {viewMode === 'table' ? (
                <AdvancedTable
                    data={tasks}
                    columns={columns}
                    rowKey="task_id"
                    loading={loading}
                    
                    // Server-side pagination
                    serverPagination={{
                        total: totalCount,
                        page: currentPage,
                        pageSize: pageSize,
                        onPageChange: setCurrentPage,
                        onPageSizeChange: setPageSize,
                    }}
                    
                    // Features
                    enableSearch={true}
                    enablePagination={true}
                    enableExport={true}
                    enableExcelExport={true}
                    enablePdfExport={true}
                    enableColumnVisibility={true}
                    enableStickyHeader={true}
                    enableKeyboardNavigation={true}
                    enableSavedViews={true}
                    enableRowExpansion={true}
                    viewStorageKey="all-tasks-list"
                    
                    // Expanded row content - Task quick preview
                    expandedRowContent={{
                        render: (task) => (
                            <div className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 border-l-4 border-l-brand-400">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Description */}
                                    <div className="md:col-span-2">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {task.description || 'No description provided.'}
                                        </p>
                                        {/* Tags */}
                                        {task.tags && (task.tags as Array<{tag_id: string; name: string; color: string}>).length > 0 && (
                                            <div className="mt-3">
                                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tags</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(task.tags as Array<{tag_id: string; name: string; color: string}>).map(tag => (
                                                        <span 
                                                            key={tag.tag_id}
                                                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Quick Info */}
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Created</h4>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {task.created_at ? new Date(task.created_at as string).toLocaleDateString() : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Due Date</h4>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {task.due_date ? new Date(task.due_date as string).toLocaleDateString() : 'Not set'}
                                            </p>
                                        </div>
                                        {/* Quick Actions */}
                                        <div className="pt-2 flex gap-2">
                                            <button
                                                onClick={() => navigate(`/pm/projects/${task.project_id}/tasks/${task.task_id}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Details
                                            </button>
                                            {task.external_url && (
                                                <a
                                                    href={task.external_url as string}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-xs font-medium transition"
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                        <text x="5" y="16" fontSize="12" fontWeight="bold">Z</text>
                                                    </svg>
                                                    Open in Zoho
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }}
                    
                    // Actions
                    rowActions={rowActions}
                    onRowClick={(row) => navigate(`/pm/projects/${row.project_id}/tasks/${row.task_id}`)}
                    
                    // Empty state
                    emptyTitle="No tasks found"
                    emptyDescription="No tasks match your current filters. Try adjusting your search criteria."
                />
            ) : (
                /* Card View */
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm animate-pulse">
                                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
                                    <div className="flex gap-2">
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
                                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-16">
                            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tasks found</h3>
                            <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tasks.map(task => (
                                    <div 
                                        key={task.task_id}
                                        onClick={() => navigate(`/pm/projects/${task.project_id}/tasks/${task.task_id}`)}
                                        className="group p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-200 cursor-pointer"
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                                                {task.title}
                                            </h3>
                                            {task.external_url && (
                                                <a
                                                    href={task.external_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="shrink-0 p-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-bold hover:from-orange-600 hover:to-red-600"
                                                    title="Open in Zoho"
                                                >
                                                    Z
                                                </a>
                                            )}
                                        </div>
                                        
                                        {/* Description */}
                                        {task.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                                {task.description}
                                            </p>
                                        )}
                                        
                                        {/* Status & Priority */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status_name)}`}>
                                                {task.status_name}
                                            </span>
                                            {task.priority_name && (
                                                <span className="text-xs">
                                                    {getPriorityBadge(task.priority_name)}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                            {/* Assignee */}
                                            {task.assignee_name ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px] flex items-center justify-center font-medium">
                                                        {task.assignee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{task.assignee_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                            
                                            {/* Project */}
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={task.project_name}>
                                                {task.project_name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Card View Pagination */}
                            <div className="flex items-center justify-between mt-6 px-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tasks
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3 py-1.5 text-sm">
                                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
