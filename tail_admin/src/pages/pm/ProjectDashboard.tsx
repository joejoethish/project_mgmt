import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import axios from 'axios';

interface TaskStatus {
    task_status_id: string;
    name: string;
    sort_order: number;
}

interface Task {
    task_id: string;
    title: string;
    status_id: string;
    priority_id: string;
    created_at: string;
}

interface ActivityLog {
    log_id: string;
    action: string;
    details: string;
    created_at: string;
}

export default function ProjectDashboard() {
    const { project } = useOutletContext<any>();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [statuses, setStatuses] = useState<TaskStatus[]>([]);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!project?.project_id) return;
            try {
                const [taskRes, statusRes, activityRes] = await Promise.all([
                    axios.get(`http://192.168.1.26:8000/api/pm/tasks/?project_id=${project.project_id}&page_size=100`),
                    axios.get('http://192.168.1.26:8000/api/pm/taskstatuses/?ordering=sort_order'),
                    axios.get(`http://192.168.1.26:8000/api/pm/activitylogs/?ordering=-created_at`).catch(() => ({ data: [] }))
                ]);
                // Handle pagination if present
                const tasksData = Array.isArray(taskRes.data) ? taskRes.data : (taskRes.data.results || []);
                setTasks(tasksData);
                setStatuses(statusRes.data);
                setActivities(activityRes.data.slice(0, 5));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [project]);

    // Calculate metrics
    const totalTasks = tasks.length;
    const completedStatus = statuses.find(s => s.name.toLowerCase().includes('done') || s.name.toLowerCase().includes('complete'));
    const completedTasks = completedStatus ? tasks.filter(t => t.status_id === completedStatus.task_status_id).length : 0;
    const inProgressStatus = statuses.find(s => s.name.toLowerCase().includes('progress'));
    const inProgressTasks = inProgressStatus ? tasks.filter(t => t.status_id === inProgressStatus.task_status_id).length : 0;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Group tasks by status for mini chart
    const statusCounts = statuses.map(s => ({
        name: s.name,
        count: tasks.filter(t => t.status_id === s.task_status_id).length,
        color: s.sort_order === 1 ? 'bg-gray-400' : s.sort_order === 2 ? 'bg-blue-500' : s.sort_order === 3 ? 'bg-yellow-500' : 'bg-green-500'
    }));

    if (loading) return <div className="animate-pulse p-4">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
                            <p className="text-4xl font-bold mt-2">{totalTasks}</p>
                        </div>
                        <div className="p-3 bg-blue-400/30 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-blue-100 text-xs mt-4">All tasks in project</p>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">In Progress</p>
                            <p className="text-4xl font-bold mt-2">{inProgressTasks}</p>
                        </div>
                        <div className="p-3 bg-amber-400/30 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-amber-100 text-xs mt-4">Currently being worked on</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">Completed</p>
                            <p className="text-4xl font-bold mt-2">{completedTasks}</p>
                        </div>
                        <div className="p-3 bg-emerald-400/30 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-emerald-100 text-xs mt-4">Tasks finished</p>
                </div>

                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-violet-100 text-sm font-medium">Completion Rate</p>
                            <p className="text-4xl font-bold mt-2">{completionRate}%</p>
                        </div>
                        <div className="p-3 bg-violet-400/30 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 bg-violet-400/30 rounded-full h-2">
                        <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${completionRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Distribution Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Task Distribution</h3>
                        <button 
                            onClick={() => navigate('board')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            View Board →
                        </button>
                    </div>
                    <div className="space-y-4">
                        {statusCounts.map((status, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">{status.name}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{status.count}</span>
                                </div>
                                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${status.color} rounded-full transition-all duration-500`}
                                        style={{ width: totalTasks > 0 ? `${(status.count / totalTasks) * 100}%` : '0%' }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {statusCounts.length === 0 && (
                            <p className="text-gray-400 text-center py-8">No status data available</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={() => navigate('board')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                            Open Kanban Board
                        </button>
                        <button 
                            onClick={() => navigate('list')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            View Task List
                        </button>
                        <button 
                            onClick={() => navigate('members')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Manage Members
                        </button>
                        <button 
                            onClick={() => navigate('edit')}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Project Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    {activities.length > 0 ? activities.map((activity) => (
                        <div key={activity.log_id} className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                A
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{activity.details || 'No details'}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(activity.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-400">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No recent activity</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

