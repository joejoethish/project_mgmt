import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import KanbanColumn from '../../components/pm/board/KanbanColumn';
import TaskCard, { Task } from '../../components/pm/board/TaskCard';

interface TaskStatus {
    task_status_id: string;
    name: string;
    description: string;
    sort_order: number;
}

interface TaskPriority {
    task_priority_id: string;
    name: string;
    level: number;
    color: string;
}

interface Member {
    member_id: string;
    first_name: string;
    last_name: string;
}

export default function KanbanBoard() {
    const { project } = useOutletContext<any>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [priorities, setPriorities] = useState<TaskPriority[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [showMyTasks, setShowMyTasks] = useState(false);
    const [dateFilterType, setDateFilterType] = useState<'created' | 'due' | 'none'>('none');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Quick add modal
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddStatus, setQuickAddStatus] = useState('');
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusRes, taskRes, memberRes, priorityRes] = await Promise.all([
                    axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order'),
                    axios.get(`http://192.168.1.26:8000/api/pm/tasks/?project_id=${project.project_id}&page_size=100`),
                    axios.get('http://192.168.1.26:8000/api/pm/members/'),
                    axios.get('http://192.168.1.26:8000/api/pm/taskpriorities/?ordering=level')
                ]);
                
                const sortedStatuses = statusRes.data.sort((a: TaskStatus, b: TaskStatus) => a.sort_order - b.sort_order);
                setStatuses(sortedStatuses);
                setPriorities(Array.isArray(priorityRes.data) ? priorityRes.data : priorityRes.data.results || []);
                
                // Handle pagination
                const tasksData = Array.isArray(taskRes.data) ? taskRes.data : (taskRes.data.results || []);
                setTasks(tasksData);
                setMembers(memberRes.data);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load board data');
            } finally {
                setLoading(false);
            }
        };

        if (project?.project_id) {
            fetchData();
        }
    }, [project]);

    // Helper to check date range
    const isWithinDateRange = (taskDateStr?: string) => {
        if (!taskDateStr || dateFilterType === 'none') return true;
        try {
            const taskDate = new Date(taskDateStr).toISOString().split('T')[0];
            const start = filterStartDate;
            const end = filterEndDate;
            if (start && taskDate < start) return false;
            if (end && taskDate > end) return false;
            return true;
        } catch {
            return true;
        }
    };

    const filteredTasks = tasks.filter(task => {
        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!task.title.toLowerCase().includes(term) && !task.description?.toLowerCase().includes(term)) return false;
        }
        // Priority
        if (filterPriority && task.priority_id !== filterPriority) return false;
        // My Tasks
        if (showMyTasks && user && task.assigned_to !== user.member_id) return false;
        // Date
        if (dateFilterType === 'created' && !isWithinDateRange(task['created_at' as keyof Task] as string)) return false; // Cast as simplified access
        if (dateFilterType === 'due' && !isWithinDateRange(task.due_date)) return false;
        
        return true;
    });

    const handleTaskDrop = async (taskId: string, newStatusId: string) => {
        const task = tasks.find(t => t.task_id === taskId);
        // If task not found or status hasn't changed, do nothing
        if (!task || task.status_id === newStatusId) return;

        // Optimistic update
        const previousTasks = [...tasks];
        setTasks(tasks.map(t => 
            t.task_id === taskId 
                ? { ...t, status_id: newStatusId } 
                : t
        ));

        try {
            await axios.patch(`http://192.168.1.26:8000/api/pm/tasks/${taskId}/`, {
                status_id: newStatusId
            });
            toast.success('Task moved');
        } catch {
            setTasks(previousTasks);
            toast.error('Failed to move task');
        }
    };

    const handleQuickAdd = async () => {
        if (!quickAddTitle.trim()) return;
        setSaving(true);
        try {
            const response = await axios.post('http://192.168.1.26:8000/api/pm/tasks/', {
                title: quickAddTitle,
                status_id: quickAddStatus,
                project_id: project.project_id
            });
            setTasks([...tasks, response.data]);
            setShowQuickAdd(false);
            setQuickAddTitle('');
            toast.success('Task created');
        } catch {
            toast.error('Failed to create task');
        } finally {
            setSaving(false);
        }
    };

    const openQuickAdd = (statusId: string) => {
        setQuickAddStatus(statusId);
        setQuickAddTitle('');
        setShowQuickAdd(true);
    };

    if (loading) {
        return (
            <div className="flex gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-80 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-xl h-96"></div>
                ))}
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-full flex flex-col">
                {/* Header & Filters */}
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        {/* Search */}
                        <div className="relative w-64">
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* My Tasks Toggle */}
                        <button
                            onClick={() => setShowMyTasks(!showMyTasks)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                showMyTasks 
                                    ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                            }`}
                        >
                            <svg className={`w-4 h-4 ${showMyTasks ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            My Tasks
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                        {/* Priority Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Priority:</span>
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="text-sm rounded-lg border-gray-300 dark:border-gray-600 py-1.5 pl-3 pr-8 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="">All Priorities</option>
                                {priorities.map(p => (
                                    <option key={p.task_priority_id} value={p.task_priority_id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                         {/* Date Filter */}
                         <div className="flex items-center gap-2">
                            <select
                                value={dateFilterType}
                                onChange={e => setDateFilterType(e.target.value as any)}
                                className="text-sm rounded-lg border-gray-300 dark:border-gray-600 py-1.5 px-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                                <option value="none">No Date Filter</option>
                                <option value="created">Created</option>
                                <option value="due">Due Date</option>
                            </select>
                            
                            {dateFilterType !== 'none' && (
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={e => setFilterStartDate(e.target.value)}
                                        className="text-sm rounded-lg border-gray-300 dark:border-gray-600 py-1 px-2"
                                    />
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={e => setFilterEndDate(e.target.value)}
                                        className="text-sm rounded-lg border-gray-300 dark:border-gray-600 py-1 px-2"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="ml-auto text-sm text-gray-500">
                             Showing <strong className="text-gray-900 dark:text-white">{filteredTasks.length}</strong> tasks
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-5 min-w-max">
                    {statuses.map(status => {
                        const columnTasks = filteredTasks.filter(t => t.status_id === status.task_status_id);
                        return (
                            <KanbanColumn
                                key={status.task_status_id}
                                statusId={status.task_status_id}
                                title={status.name}
                                count={columnTasks.length}
                                sortOrder={status.sort_order}
                                items={columnTasks}
                                onTaskDrop={handleTaskDrop}
                                onAddClick={openQuickAdd}
                                renderItem={(task) => (
                                    <TaskCard 
                                        key={task.task_id}
                                        task={task}
                                        members={members}
                                        onClick={() => navigate(`/pm/projects/${project.project_id}/tasks/${task.task_id}`)}
                                    />
                                )}
                            />
                        );
                    })}
                </div>
                </div>
            </div>

            {/* Quick Add Modal */}
            {showQuickAdd && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Add Task</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Adding to: {statuses.find(s => s.task_status_id === quickAddStatus)?.name}
                            </p>
                        </div>
                        <div className="p-6">
                            <input
                                type="text"
                                placeholder="Task title..."
                                value={quickAddTitle}
                                onChange={e => setQuickAddTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                                autoFocus
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-400 mt-2">Press Enter to create or click Create Task</p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                            <button
                                onClick={() => navigate(`tasks/new`)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Full editor →
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowQuickAdd(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickAdd}
                                    disabled={saving || !quickAddTitle.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {saving ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DndProvider>
    );
}

