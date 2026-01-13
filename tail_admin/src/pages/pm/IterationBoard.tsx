import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Modal } from '../../components/ui/modal';
import KanbanColumn from '../../components/pm/board/KanbanColumn';
import IterationTaskCard, { IterationTask } from '../../components/pm/board/IterationTaskCard';

interface TaskStatus {
    task_status_id: string;
    name: string;
    sort_order: number;
}

interface Iteration {
    iteration_id: string;
    name: string;
    goal: string;
    start_date: string;
    end_date: string;
    task_count: number;
    total_points: number;
}

interface Task {
    task_id: string;
    title: string;
    project_id: string;
    status_id: string;
    priority_id?: string;
    priority_name?: string; // If serializer sends it, or we map it
    due_date?: string;
    created_at?: string;
    project_name?: string; // If serializer sends it
    status_name?: string;
}

interface Project {
    project_id: string;
    name: string;
}

interface TaskPriority {
    task_priority_id: string;
    name: string;
    color?: string; // Optional if you use it later
}

export default function IterationBoard() {
    const { id } = useParams();
    const { user } = useAuth(); // Get current user
    const navigate = useNavigate();
    const [iteration, setIteration] = useState<Iteration | null>(null);
    const [iterationTasks, setIterationTasks] = useState<IterationTask[]>([]);
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [loading, setLoading] = useState(true);
    
    // For adding tasks
    const [showAddModal, setShowAddModal] = useState(false);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [priorities, setPriorities] = useState<TaskPriority[]>([]);
    
    // Filters
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');
    const [dateFilterType, setDateFilterType] = useState<'created' | 'due' | 'none'>('none');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [taskSearch, setTaskSearch] = useState('');
    const [showMyTasks, setShowMyTasks] = useState(false);
    const [filterPriority, setFilterPriority] = useState('');

    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const [priorityPoints, setPriorityPoints] = useState(0);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [iterRes, tasksRes, statusRes, priorityRes] = await Promise.all([
                    axios.get(`http://192.168.1.26:8000/api/pm/iterations/${id}/`),
                    axios.get(`http://192.168.1.26:8000/api/pm/iterationtasks/?iteration_id=${id}`),
                    axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order'),
                    axios.get('http://192.168.1.26:8000/api/pm/taskpriorities/') // Fetch on load
                ]);
                setIteration(iterRes.data);
                setIterationTasks(tasksRes.data);
                setStatuses(statusRes.data.sort((a: TaskStatus, b: TaskStatus) => a.sort_order - b.sort_order));
                setPriorities(Array.isArray(priorityRes.data) ? priorityRes.data : priorityRes.data.results || []);
            } catch {
                toast.error('Failed to load iteration data');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    // Derived filtered tasks
    const filteredTasks = iterationTasks.filter(task => {
        if (!task || !task.task_details) return false;

        // My Tasks Filter
        if (showMyTasks && user) {
            if (task.task_details.assigned_to?.id !== user.member_id) return false;
        }
        
        // Priority Filter
        if (filterPriority) {
            if (task.task_details.priority_id !== filterPriority) return false;
        }

        return true;
    });

    const handleTaskDrop = async (taskId: string, newStatusId: string) => {
        const iterTask = iterationTasks.find(it => it.task_details?.task_id === taskId);
        if (!iterTask || iterTask.task_details?.status_id === newStatusId) return;

        const previousTasks = [...iterationTasks];
        setIterationTasks(tasks => tasks.map(it => {
            if (it.task_details?.task_id === taskId) {
                return {
                    ...it,
                    task_details: {
                        ...it.task_details,
                        status_id: newStatusId,
                        status_name: statuses.find(s => s.task_status_id === newStatusId)?.name || it.task_details.status_name
                    }
                };
            }
            return it;
        }));

        try {
            await axios.patch(`http://192.168.1.26:8000/api/pm/tasks/${taskId}/`, {
                status_id: newStatusId,
                modified_by: '1f0bb929-e50c-4e99-a5c0-f2a480d8f8af' // Mock User (Unified User)
            });
            toast.success('Task status updated');

        } catch (e: any) {
            setIterationTasks(previousTasks);
            // Show specific backend error if available
            const errorMsg = e.response?.data?.detail || e.response?.data?.[0] || 'Failed to update status';
            toast.error(errorMsg);
        }
    };

    const openAddModal = async () => {
        try {
            const [projRes, taskRes] = await Promise.all([
                axios.get('http://192.168.1.26:8000/api/pm/projects/'),
                axios.get('http://192.168.1.26:8000/api/pm/tasks/?page_size=1000')
            ]);
            setProjects(Array.isArray(projRes.data) ? projRes.data : projRes.data.results || []);
            setAllTasks(Array.isArray(taskRes.data) ? taskRes.data : taskRes.data.results || []);
            setShowAddModal(true);
        } catch {
            toast.error('Failed to load add task data');
        }
    };

    const handleAddTask = async () => {
        if (selectedTasks.size === 0) return;
        setSending(true);
        try {
            await Promise.all(Array.from(selectedTasks).map(taskId => 
                axios.post('http://192.168.1.26:8000/api/pm/iterationtasks/', {
                    iteration: id,
                    task: taskId,
                    priority_points: priorityPoints
                })
            ));
            
            // Refetch to get full details
            const updated = await axios.get(`http://192.168.1.26:8000/api/pm/iterationtasks/?iteration_id=${id}`);
            setIterationTasks(updated.data);
            setShowAddModal(false);
            setSelectedTasks(new Set());
            setPriorityPoints(0);
            toast.success(`${selectedTasks.size} tasks added to iteration`);
        } catch {
            toast.error('Failed to add tasks');
        } finally {
            setSending(false);
        }
    };

    const handleRemoveTask = async (iterationTaskId: string) => {
        if (!confirm('Remove this task from iteration?')) return;
        try {
            await axios.delete(`http://192.168.1.26:8000/api/pm/iterationtasks/${iterationTaskId}/`);
            setIterationTasks(iterationTasks.filter(t => t.iteration_task_id !== iterationTaskId));
            toast.success('Task removed');
        } catch {
            toast.error('Failed to remove task');
        }
    };


    // Filter Logic
    const existingTaskIds = new Set(iterationTasks.map(it => it.task));
    
    // Helper to check date range
    const isWithinDateRange = (taskDateStr?: string, debug = false) => {
        if (!taskDateStr || dateFilterType === 'none') return true;
        
        try {
            // Normalize dates to YYYY-MM-DD for comparison
            const taskDate = new Date(taskDateStr).toISOString().split('T')[0];
            const start = filterStartDate;
            const end = filterEndDate;

            if (debug) console.log('Checking Date:', { taskDate, start, end, type: dateFilterType });

            if (start && taskDate < start) {
                if (debug) console.log('Failed Start:', taskDate, '<', start);
                return false;
            }
            if (end && taskDate > end) {
                if (debug) console.log('Failed End:', taskDate, '>', end);
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('Date parsing error', e, taskDateStr);
            return true;
        }
    };

    const availableTasks = allTasks.filter((t, index) => {
        // Exclude already added
        if (existingTaskIds.has(t.task_id)) return false;

        // Project Filter
        if (selectedProject && t.project_id !== selectedProject) return false;

        // Priority Filter
        if (selectedPriority && t.priority_id !== selectedPriority) return false;

        // Search Filter
        if (taskSearch) {
             const searchLower = taskSearch.toLowerCase();
             const titleMatch = t.title?.toLowerCase().includes(searchLower);
             const idMatch = t.task_id.toLowerCase().includes(searchLower);
             if (!titleMatch && !idMatch) return false;
        }

        // Date Filter
        const debug = index === 0; // Log only first item
        if (dateFilterType === 'created' && !isWithinDateRange(t.created_at, debug)) return false;
        if (dateFilterType === 'due' && !isWithinDateRange(t.due_date, debug)) return false;

        return true;
    });

    if (loading) {
        return (
            <div className="p-6 animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-72 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!iteration) {
        return <div className="p-6 text-red-500">Iteration not found</div>;
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => navigate('/pm/iterations')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{iteration.name}</h1>
                            </div>
                            {iteration.goal && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 ml-10">{iteration.goal}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="text-right text-sm">
                                <div className="text-gray-500">Tasks: <strong className="text-gray-900 dark:text-white">{iterationTasks.length}</strong></div>
                                <div className="text-gray-500">Points: <strong className="text-gray-900 dark:text-white">{iterationTasks.reduce((sum, t) => sum + t.priority_points, 0)}</strong></div>
                            </div>
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Task
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-4 py-2 border-t border-gray-100 dark:border-gray-700">
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
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                        {statuses.map(status => {
                            const columnTasks = filteredTasks.filter(it => it.task_details?.status_id === status.task_status_id);
                            const totalPoints = columnTasks.reduce((sum, t) => sum + (t.priority_points || 0), 0);
                            return (
                                <KanbanColumn
                                    key={status.task_status_id}
                                    statusId={status.task_status_id}
                                    title={status.name}
                                    count={columnTasks.length}
                                    totalPoints={totalPoints}
                                    sortOrder={status.sort_order}
                                    items={columnTasks}
                                    onTaskDrop={handleTaskDrop}
                                    renderItem={(iterTask) => (
                                        <IterationTaskCard 
                                            key={iterTask.iteration_task_id}
                                            task={iterTask}
                                            onRemove={handleRemoveTask}
                                            onClick={() => {
                                                if (iterTask.project_details?.project_id && iterTask.task_details?.task_id) {
                                                    navigate(`/pm/projects/${iterTask.project_details.project_id}/tasks/${iterTask.task_details.task_id}`);
                                                } else {
                                                    toast.error('Task project details missing');
                                                }
                                            }}
                                        />
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>

            {/* Add Task Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                className="max-w-4xl p-6 h-[80vh] flex flex-col" // Increased width and fixed height
                closeOnOverlayClick={false}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Task to Iteration</h2>
                    <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Filters Section */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Project Filter */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Project</label>
                            <select
                                value={selectedProject}
                                onChange={e => setSelectedProject(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.project_id} value={p.project_id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div className="w-[180px]">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Priority</label>
                            <select
                                value={selectedPriority}
                                onChange={e => setSelectedPriority(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                            >
                                <option value="">All Priorities</option>
                                {priorities.map(p => (
                                    <option key={p.task_priority_id} value={p.task_priority_id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Filter Type */}
                        <div className="w-[180px]">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Date Filter</label>
                            <select
                                value={dateFilterType}
                                onChange={e => setDateFilterType(e.target.value as any)}
                                className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                            >
                                <option value="none">No Date Filter</option>
                                <option value="created">Created Date</option>
                                <option value="due">Due Date</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Range Inputs - Only show if filter selected */}
                    {dateFilterType !== 'none' && (
                        <div className="flex gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="w-[180px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={e => setFilterStartDate(e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div className="w-[180px]">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={e => setFilterEndDate(e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Search and Main Content */}
                <div className="flex-1 min-h-0 flex flex-col border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="relative w-80">
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={taskSearch}
                                onChange={e => setTaskSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                <span className="text-gray-900 dark:text-white font-bold">{selectedTasks.size}</span> tasks selected
                            </span>
                            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                            <button
                                onClick={() => {
                                    if (selectedTasks.size === availableTasks.length) {
                                        setSelectedTasks(new Set());
                                    } else {
                                        setSelectedTasks(new Set(availableTasks.map(t => t.task_id)));
                                    }
                                }}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
                            >
                                {selectedTasks.size === availableTasks.length && availableTasks.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    {/* Task Table */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3 w-14 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={availableTasks.length > 0 && selectedTasks.size === availableTasks.length}
                                            onChange={() => {
                                                if (selectedTasks.size === availableTasks.length) {
                                                    setSelectedTasks(new Set());
                                                } else {
                                                    setSelectedTasks(new Set(availableTasks.map(t => t.task_id)));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-3">Task</th>
                                    <th className="px-6 py-3">Project</th>
                                    <th className="px-6 py-3">Priority</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {availableTasks.map(task => (
                                    <tr 
                                        key={task.task_id} 
                                        onClick={() => {
                                            const newSet = new Set(selectedTasks);
                                            if (newSet.has(task.task_id)) newSet.delete(task.task_id);
                                            else newSet.add(task.task_id);
                                            setSelectedTasks(newSet);
                                        }}
                                        className={`group hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${selectedTasks.has(task.task_id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox"
                                                checked={selectedTasks.has(task.task_id)}
                                                onChange={() => {}} // Handled by row click
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                                                {task.title}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1 font-mono">{task.task_id.slice(0,8)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                                                {task.project_name || projects.find(p => p.project_id === task.project_id)?.name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {task.priority_name && (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                    ${task.priority_name === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                      task.priority_name === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                                      'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                    {task.priority_name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                {task.status_name || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {availableTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                <p className="text-base font-medium">No tasks found</p>
                                                <p className="text-sm mt-1">Try adjusting your filters or search query</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Priority Points <span className="text-gray-400 font-normal">(per task)</span>
                        </label>
                        <input 
                            type="number" 
                            min="0" 
                            value={priorityPoints}
                            onChange={e => setPriorityPoints(parseInt(e.target.value) || 0)}
                            className="w-24 rounded-lg border-gray-300 dark:border-gray-600 py-1.5 px-3 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddTask}
                            disabled={selectedTasks.size === 0 || sending}
                            className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-sm hover:shadow flex items-center gap-2"
                        >
                            {sending ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding...
                                </>
                            ) : (
                                `Add ${selectedTasks.size} Tasks`
                            )}
                        </button>
                    </div>
                </div>

            </Modal>
        </div>
        </DndProvider>
    );
}

