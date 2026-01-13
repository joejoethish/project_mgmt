import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import TagFilter from '../../components/TagFilter';
import ImportModal from '../../components/ImportModal';

interface Task {
    task_id: string;
    title: string;
    description: string;
    status_id: string;
    priority_id: string;
    assigned_to: string;
    due_date: string;
    created_at: string;
    external_url?: string; // Zoho Connect task URL
    tags?: {
        tag_id: string;
        name: string;
        color: string;
    }[];
}

interface TaskStatus {
    task_status_id: string;
    name: string;
    sort_order: number;
}

interface TaskPriority {
    task_priority_id: string;
    name: string;
    level: number;
}

interface Member {
    member_id: string;
    first_name: string;
    last_name: string;
}

export default function TaskList() {
    const { project } = useOutletContext<any>();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [priorities, setPriorities] = useState<TaskPriority[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [showImport, setShowImport] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            if (!project?.project_id) return;
            try {
                const [taskRes, statusRes, priorityRes, memberRes] = await Promise.all([
                    axios.get(`http://192.168.1.26:8000/api/pm/tasks/?project_id=${project.project_id}${filterTags.length ? '&tags=' + filterTags.join(',') : ''}&page_size=100`),
                    axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order'),
                    axios.get('http://192.168.1.26:8000/api/pm/taskpriorities/?ordering=level').catch(() => ({ data: [] })),
                    axios.get('http://192.168.1.26:8000/api/pm/members/')
                ]);
                                // Handle pagination if present
                const tasksData = Array.isArray(taskRes.data) ? taskRes.data : (taskRes.data.results || []);
                setTasks(tasksData);
                setStatuses(statusRes.data);
                setPriorities(priorityRes.data);
                setMembers(memberRes.data);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [project, filterTags]);

    const getStatusName = (statusId: string) => {
        const status = statuses.find(s => s.task_status_id === statusId);
        return status?.name || 'Unknown';
    };

    const getStatusColor = (statusId: string) => {
        const status = statuses.find(s => s.task_status_id === statusId);
        if (!status) return 'bg-gray-100 text-gray-800';
        const order = status.sort_order;
        if (order === 1) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        if (order === 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        if (order === 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    };

    const getPriorityName = (priorityId: string) => {
        const priority = priorities.find(p => p.task_priority_id === priorityId);
        return priority?.name || '-';
    };

    const getPriorityColor = (priorityId: string) => {
        const priority = priorities.find(p => p.task_priority_id === priorityId);
        if (!priority) return '';
        const level = priority.level;
        if (level >= 3) return 'text-red-600 dark:text-red-400';
        if (level === 2) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-gray-500 dark:text-gray-400';
    };

    const getAssigneeName = (memberId: string) => {
        const member = members.find(m => m.member_id === memberId);
        return member ? `${member.first_name} ${member.last_name}` : '-';
    };

    const getAssigneeInitials = (memberId: string) => {
        const member = members.find(m => m.member_id === memberId);
        if (!member) return '?';
        return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/pm/tasks/${taskId}/`);
            setTasks(tasks.filter(t => t.task_id !== taskId));
            toast.success('Task deleted');
        } catch (err) {
            toast.error('Failed to delete task');
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              task.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || task.status_id === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-3 flex-1 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                {/* Filters */}
                <div className="flex gap-2">
                    <TagFilter
                        selectedTagIds={filterTags}
                        onChange={setFilterTags}
                    />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(status => (
                            <option key={status.task_status_id} value={status.task_status_id}>
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Import Button */}
                <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import
                </button>
                {/* Add Task Button */}
                <button
                    onClick={() => navigate(`/pm/projects/${project.project_id}/tasks/new`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                </button>
            </div>

            {/* Tasks Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Task</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Priority</th>
                                <th className="px-6 py-4 font-semibold">Assignee</th>
                                <th className="px-6 py-4 font-semibold">Due Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(task => (
                                <tr key={task.task_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {task.tags?.map(tag => (
                                                <span 
                                                    key={tag.tag_id}
                                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                                    style={{ 
                                                        backgroundColor: tag.color + '15', 
                                                        color: tag.color,
                                                        borderColor: tag.color + '20'
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                        {task.description && (
                                            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-1 max-w-md">
                                                {task.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status_id)}`}>
                                            {getStatusName(task.status_id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium ${getPriorityColor(task.priority_id)}`}>
                                            {getPriorityName(task.priority_id)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {task.assigned_to ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                                    {getAssigneeInitials(task.assigned_to)}
                                                </div>
                                                <span className="text-gray-700 dark:text-gray-300">{getAssigneeName(task.assigned_to)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            {task.external_url && (
                                                <a
                                                    href={task.external_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600 transition text-xs font-bold shadow-sm"
                                                    title="Open in Zoho Connect"
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                        <text x="4" y="17" fontSize="14" fontWeight="bold" fontFamily="Arial">Z</text>
                                                    </svg>
                                                    Zoho
                                                </a>
                                            )}
                                            <button
                                                onClick={() => navigate(`/pm/projects/${project.project_id}/tasks/${task.task_id}`)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.task_id)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
                                        <button
                                            onClick={() => navigate('tasks/new')}
                                            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Create your first task →
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="flex items-center gap-4">
                    <span className="text-gray-500 dark:text-gray-400">
                        Showing {Math.min((currentPage - 1) * pageSize + 1, filteredTasks.length)} - {Math.min(currentPage * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks
                    </span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        ««
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        ‹
                    </button>
                    <span className="px-3 py-1 text-gray-700 dark:text-gray-200">
                        Page {currentPage} of {Math.max(1, Math.ceil(filteredTasks.length / pageSize))}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / pageSize), p + 1))}
                        disabled={currentPage >= Math.ceil(filteredTasks.length / pageSize)}
                        className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        ›
                    </button>
                    <button
                        onClick={() => setCurrentPage(Math.ceil(filteredTasks.length / pageSize))}
                        disabled={currentPage >= Math.ceil(filteredTasks.length / pageSize)}
                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        »»
                    </button>
                </div>
            </div>

            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onSuccess={() => {
                    setShowImport(false);
                    // Reload tasks
                    // Reload tasks
                    axios.get(`http://192.168.1.26:8000/api/pm/tasks/?project_id=${project.project_id}&page_size=100`)
                        .then(res => {
                             const tasksData = Array.isArray(res.data) ? res.data : (res.data.results || []);
                             setTasks(tasksData);
                        });
                }}
                title="Import Tasks"
                importEndpoint="http://192.168.1.26:8000/api/pm/import/tasks/"
                templateEndpoint="http://192.168.1.26:8000/api/pm/import/tasks/"
                additionalData={{ project_id: project?.project_id || '' }}
            />
        </div>
    );
}

