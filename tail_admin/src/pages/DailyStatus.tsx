import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Use hardcoded API URL for consistency with other pages
const API_BASE = 'http://192.168.1.26:8000/api/pm';

interface Task {
    task_id: string;
    title: string;
    project_id: string;
    status_name?: string;
}

interface Project {
    project_id: string;
    name: string;
}

interface StandupItem {
    section: 'yesterday' | 'today' | 'blocker';
    project_id: string;
    task_id: string;
    description: string;
    status_snapshot?: string;
    tempId?: number;
}

type ViewMode = 'edit' | 'review' | 'readonly';

export default function DailyStatusPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    
    // Mode State
    const [mode, setMode] = useState<ViewMode>('edit');
    const [existingStandupId, setExistingStandupId] = useState<string | null>(null);
    
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [yesterdayItems, setYesterdayItems] = useState<StandupItem[]>([]);
    const [todayItems, setTodayItems] = useState<StandupItem[]>([]);
    const [blockerItems, setBlockerItems] = useState<StandupItem[]>([]);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchMasters();
    }, []);

    useEffect(() => {
        if (user?.member_id && date) {
            fetchExistingStandup();
        }
    }, [user, date]);

    const fetchMasters = async () => {
        try {
            // Filter tasks by member_id (show user's assigned tasks)
            const taskParams = user?.member_id ? { member_id: user.member_id } : {};
            const [tasksRes, projectsRes] = await Promise.all([
                axios.get(`${API_BASE}/tasks/`, { params: taskParams }),
                axios.get(`${API_BASE}/projects/`)
            ]);
            
            const userTasks = tasksRes.data;
            const allProjects = projectsRes.data;
            
            // Filter projects to only those where user has tasks assigned
            const userProjectIds = [...new Set(userTasks.map((t: Task) => t.project_id))];
            const filteredProjects = allProjects.filter((p: Project) => userProjectIds.includes(p.project_id));
            
            setTasks(userTasks);
            setProjects(filteredProjects);
        } catch (error) {
            console.error("Failed to fetch masters", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingStandup = async () => {
        try {
            const res = await axios.get(`${API_BASE}/dailystandups/`, {
                params: { member: user?.member_id, date: date }
            });
            
            if (res.data && res.data.length > 0) {
                const existing = res.data[0];
                setExistingStandupId(existing.standup_id || existing.id);
                
                const mapBackendItem = (i: any) => ({
                    ...i,
                    tempId: Math.random(),
                    project_id: i.project || '',
                    task_id: i.task || ''
                });

                const items = existing.items || [];
                setYesterdayItems(items.filter((i: any) => i.section === 'yesterday').map(mapBackendItem));
                setTodayItems(items.filter((i: any) => i.section === 'today').map(mapBackendItem));
                setBlockerItems(items.filter((i: any) => i.section === 'blocker').map(mapBackendItem));
                
                // If existing entry, show in readonly mode
                setMode('readonly');
            } else {
                setExistingStandupId(null);
                setYesterdayItems([]);
                setTodayItems([]);
                setBlockerItems([]);
                setMode('edit');
            }
        } catch (error) {
            console.error("Failed to fetch existing standup", error);
        }
    };

    const addItem = (section: 'yesterday' | 'today' | 'blocker') => {
        const newItem: StandupItem = {
            section,
            project_id: '',
            task_id: '',
            description: '',
            tempId: Date.now()
        };
        if (section === 'yesterday') setYesterdayItems([...yesterdayItems, newItem]);
        if (section === 'today') setTodayItems([...todayItems, newItem]);
        if (section === 'blocker') setBlockerItems([...blockerItems, newItem]);
    };

    const updateItem = (section: 'yesterday' | 'today' | 'blocker', index: number, field: keyof StandupItem, value: string) => {
        const updater = (items: StandupItem[]) => {
            const newItems = [...items];
            newItems[index] = { ...newItems[index], [field]: value };
            if (field === 'task_id') {
                const task = tasks.find(t => t.task_id === value);
                newItems[index].status_snapshot = task?.status_name || '';
            }
            return newItems;
        };
        if (section === 'yesterday') setYesterdayItems(prev => updater(prev));
        if (section === 'today') setTodayItems(prev => updater(prev));
        if (section === 'blocker') setBlockerItems(prev => updater(prev));
    };

    const removeItem = (section: 'yesterday' | 'today' | 'blocker', index: number) => {
        if (section === 'yesterday') setYesterdayItems(prev => prev.filter((_, i) => i !== index));
        if (section === 'today') setTodayItems(prev => prev.filter((_, i) => i !== index));
        if (section === 'blocker') setBlockerItems(prev => prev.filter((_, i) => i !== index));
    };

    const getProjectName = (projectId: string) => projects.find(p => p.project_id === projectId)?.name || 'N/A';
    const getTaskName = (taskId: string) => tasks.find(t => t.task_id === taskId)?.title || 'N/A';

    const handleSubmit = async () => {
        setSaving(true);
        setSuccessMsg('');
        try {
            const payload = {
                member: user?.member_id,
                date: date,
                items: [
                    ...yesterdayItems,
                    ...todayItems,
                    ...blockerItems
                ].map(({ tempId, project_id, task_id, ...rest }) => ({
                    ...rest,
                    project: project_id || null,
                    task: task_id || null
                }))
            };

            // Use PUT for existing entries, POST for new
            if (existingStandupId) {
                await axios.put(`${API_BASE}/dailystandups/${existingStandupId}/`, payload);
            } else {
                await axios.post(`${API_BASE}/dailystandups/`, payload);
            }
            
            setSuccessMsg("Standup saved successfully!");
            setMode('readonly');
            fetchExistingStandup();
            setTimeout(() => setSuccessMsg(''), 3000);

        } catch (error) {
            console.error("Failed to save standup", error);
            if (axios.isAxiosError(error) && error.response) {
                alert(`Failed to save: ${JSON.stringify(error.response.data)}`);
            } else {
                alert("Failed to save standup. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading system...</div>;

    // Step Indicator Component
    const StepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-6">
            {['edit', 'review', 'readonly'].map((step, idx) => (
                <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                        ${mode === step ? 'bg-brand-600 text-white scale-110' : 
                          (mode === 'readonly' && step !== 'readonly') || (mode === 'review' && step === 'edit') 
                            ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {idx + 1}
                    </div>
                    {idx < 2 && <div className={`w-12 h-1 mx-1 ${
                        (mode === 'review' && step === 'edit') || (mode === 'readonly') ? 'bg-green-500' : 'bg-gray-200'
                    }`} />}
                </div>
            ))}
            <div className="ml-4 text-sm text-gray-500">
                {mode === 'edit' && 'Editing'}
                {mode === 'review' && 'Review & Confirm'}
                {mode === 'readonly' && 'Saved'}
            </div>
        </div>
    );

    // Readonly Row Component
    const renderReadonlyRow = (item: StandupItem, index: number) => (
        <div key={item.tempId || index} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-3">
            <div className="col-span-3">
                <span className="text-xs text-gray-500 uppercase">Project</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{getProjectName(item.project_id)}</p>
            </div>
            <div className="col-span-3">
                <span className="text-xs text-gray-500 uppercase">Task</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{getTaskName(item.task_id)}</p>
            </div>
            <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase">Status</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{item.status_snapshot || '-'}</p>
            </div>
            <div className="col-span-4">
                <span className="text-xs text-gray-500 uppercase">Notes</span>
                <p className="text-gray-600 dark:text-gray-300">{item.description || '-'}</p>
            </div>
        </div>
    );

    // Editable Row Component
    const renderEditRow = (item: StandupItem, index: number, section: 'yesterday' | 'today' | 'blocker') => {
        const filteredTasks = item.project_id ? tasks.filter(t => t.project_id === item.project_id) : tasks;
        return (
            <div key={item.tempId} className="grid grid-cols-12 gap-4 mb-3 items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Project</label>
                    <select
                        value={item.project_id}
                        onChange={(e) => updateItem(section, index, 'project_id', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 text-sm"
                    >
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Task</label>
                    <select
                        value={item.task_id}
                        onChange={(e) => updateItem(section, index, 'task_id', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 text-sm"
                    >
                        <option value="">Select Task</option>
                        {filteredTasks.map(t => <option key={t.task_id} value={t.task_id}>{t.title}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                    <div className="px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 text-sm min-h-[38px]">
                        {item.status_snapshot || <span className="text-gray-400 italic">Auto-filled</span>}
                    </div>
                </div>
                <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {section === 'blocker' ? 'Blocker Detail' : 'Notes'}
                    </label>
                    <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(section, index, 'description', e.target.value)}
                        placeholder={section === 'blocker' ? "What is blocking you?" : "Any specifics..."}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-brand-500 text-sm"
                    />
                </div>
                <div className="col-span-1 flex justify-end pt-6">
                    <button onClick={() => removeItem(section, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    // Section Component
    const renderSection = (title: string, items: StandupItem[], section: 'yesterday' | 'today' | 'blocker', color: string) => (
        <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-sm`}>
                        {section === 'yesterday' ? 'Yes' : section === 'today' ? 'Tod' : 'Blk'}
                    </span>
                    {title}
                </h2>
                {mode === 'edit' && (
                    <button onClick={() => addItem(section)} className={`text-sm px-3 py-1.5 ${color} rounded-lg font-semibold flex items-center gap-1`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                        </svg>
                        Add Item
                    </button>
                )}
            </div>
            {items.length === 0 && <p className="text-gray-400 text-sm italic p-4 border border-dashed rounded-xl text-center">No items.</p>}
            {items.map((item, idx) => mode === 'edit' ? renderEditRow(item, idx, section) : renderReadonlyRow(item, idx))}
        </section>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">Daily Standup</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Logged in as <span className="font-semibold text-brand-600">{user?.first_name || 'Guest'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300">Date:</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        disabled={mode !== 'edit' && mode !== 'readonly'}
                        className="px-4 py-2 border-2 border-brand-100 dark:border-brand-900 rounded-xl bg-brand-50 dark:bg-gray-700 font-medium"
                    />
                </div>
            </div>

            <StepIndicator />

            {successMsg && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    {successMsg}
                </div>
            )}

            {/* Sections */}
            {renderSection("Yesterday's Achievements", yesterdayItems, 'yesterday', 'bg-orange-100 text-orange-600')}
            {renderSection("Today's Plan", todayItems, 'today', 'bg-blue-100 text-blue-600')}
            {renderSection("Blockers & Impediments", blockerItems, 'blocker', 'bg-red-100 text-red-600')}

            {/* Action Buttons */}
            <div className="pt-8 flex justify-end gap-4">
                {mode === 'edit' && (
                    <button
                        onClick={() => setMode('review')}
                        className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 shadow-lg"
                    >
                        Review & Confirm →
                    </button>
                )}
                {mode === 'review' && (
                    <>
                        <button onClick={() => setMode('edit')} className="px-6 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                            ← Back to Edit
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}
                        >
                            {saving ? 'Saving...' : '✓ Confirm & Save'}
                        </button>
                    </>
                )}
                {mode === 'readonly' && (
                    <button
                        onClick={() => setMode('edit')}
                        className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        Edit Standup
                    </button>
                )}
            </div>
        </div>
    );
}

