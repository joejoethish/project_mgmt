import { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';
import TaskComments from './TaskComments';
import TagSelector from '../../components/TagSelector';

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

export default function TaskForm() {
    const { project } = useOutletContext<any>();
    const { taskId } = useParams();
    const navigate = useNavigate();
    const isEdit = !!taskId && taskId !== 'new';
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status_id: '',
        priority_id: '',
        assigned_to: '',
        due_date: '',
        estimated_hours: '',
        project_id: '',
        tag_ids: [] as string[],
        external_url: ''
    });
    
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [priorities, setPriorities] = useState<TaskPriority[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [statusRes, priorityRes, memberRes] = await Promise.all([
                    axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order'),
                    axios.get('http://192.168.1.26:8000/api/pm/taskpriorities/?ordering=level').catch(() => ({ data: [] })),
                    axios.get('http://192.168.1.26:8000/api/pm/members/')
                ]);
                setStatuses(statusRes.data);
                setPriorities(priorityRes.data);
                setMembers(memberRes.data);
                
                // Set default status if creating new task
                if (!isEdit && statusRes.data.length > 0) {
                    const defaultStatus = statusRes.data.find((s: TaskStatus) => s.sort_order === 1) || statusRes.data[0];
                    setFormData(prev => ({ ...prev, status_id: defaultStatus.task_status_id }));
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchOptions();
    }, [isEdit]);

    useEffect(() => {
        if (project?.project_id) {
            setFormData(prev => ({ ...prev, project_id: project.project_id }));
        }
    }, [project]);

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/pm/tasks/${taskId}/`)
                .then(res => {
                    const data = res.data;
                    if (data.due_date) data.due_date = data.due_date.split('T')[0];
                    setFormData({
                        title: data.title || '',
                        description: data.description || '',
                        status_id: data.status_id || '',
                        priority_id: data.priority_id || '',
                        assigned_to: data.assigned_to || '',
                        due_date: data.due_date || '',
                        estimated_hours: data.estimated_hours || '',
                        project_id: data.project_id || '',
                        tag_ids: data.tags ? data.tags.map((t: any) => t.tag_id) : [],
                        external_url: data.external_url || ''
                    });
                })
                .catch(() => toast.error('Failed to load task'))
                .finally(() => setLoading(false));
        }
    }, [taskId, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            ...formData,
            estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
            assigned_to: formData.assigned_to || null,
            priority_id: formData.priority_id || null,
            due_date: formData.due_date || null,
            external_url: formData.external_url || null
        };

        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/pm/tasks/${taskId}/`, payload);
                toast.success('Task updated successfully');
            } else {
                await axios.post('http://192.168.1.26:8000/api/pm/tasks/', payload);
                toast.success('Task created successfully');
            }
            navigate(-1);
        } catch (error: any) {
            const errorData = error.response?.data;
            let errorMsg = 'Failed to save task';
            if (typeof errorData === 'string') {
                errorMsg = errorData;
            } else if (Array.isArray(errorData)) {
                errorMsg = errorData.join(', ');
            } else if (typeof errorData === 'object') {
                errorMsg = Object.entries(errorData).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse p-6">Loading task...</div>;

    return (
        <div className={`mx-auto ${isEdit ? 'max-w-6xl' : 'max-w-3xl'}`}>
            <div className={`grid gap-6 ${isEdit ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
                {/* Main Form */}
                <div className={`${isEdit ? 'lg:col-span-2' : ''}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isEdit ? 'Edit Task' : 'Create New Task'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isEdit ? 'Update task details below' : 'Fill in the task details to create a new task'}
                        </p>
                    </div>
                    {isEdit && formData.external_url && (
                        <a
                            href={formData.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition font-medium text-sm shadow-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <text x="2" y="17" fontSize="12" fontWeight="bold" fontFamily="Arial">Z</text>
                            </svg>
                            Open in Zoho
                        </a>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Task Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Enter task title..."
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            rows={4}
                            placeholder="Describe the task..."
                        />
                    </div>

                    {/* Status & Priority Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.status_id}
                                onChange={e => setFormData({ ...formData, status_id: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                required
                            >
                                <option value="">Select Status</option>
                                {statuses.map(status => (
                                    <option key={status.task_status_id} value={status.task_status_id}>
                                        {status.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority
                            </label>
                            <select
                                value={formData.priority_id}
                                onChange={e => setFormData({ ...formData, priority_id: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="">Select Priority</option>
                                {priorities.map(priority => (
                                    <option key={priority.task_priority_id} value={priority.task_priority_id}>
                                        {priority.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Assignee & Due Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Assignee
                            </label>
                            <select
                                value={formData.assigned_to}
                                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="">Unassigned</option>
                                {members.map(member => (
                                    <option key={member.member_id} value={member.member_id}>
                                        {member.first_name} {member.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                    </div>


                    {/* Estimated Hours */}
                    <div className="max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Estimated Hours
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.estimated_hours}
                            onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="0"
                        />
                    </div>

                    {/* Tags */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                         <TagSelector
                            selectedTagIds={formData.tag_ids}
                            onChange={ids => setFormData({ ...formData, tag_ids: ids })}
                         />
                    </div>

                    {/* External URL (Zoho Connect) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                                    <text x="4" y="17" fontSize="14" fontWeight="bold" fontFamily="Arial">Z</text>
                                </svg>
                                External URL (Zoho Connect)
                            </span>
                        </label>
                        <input
                            type="url"
                            value={formData.external_url}
                            onChange={e => setFormData({ ...formData, external_url: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                            placeholder="https://connect.zoho.com/portal/..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Paste the Zoho Connect task URL to link this task
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving && (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isEdit ? 'Update Task' : 'Create Task'}
                        </button>
                    </div>
                </form>
                </div>
            </div>

            {/* Comments Section - Only show when editing */}
            {isEdit && taskId && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <TaskComments taskId={taskId} currentMemberId={members[0]?.member_id} />
                </div>
            )}
        </div>
    </div>
    );
}

