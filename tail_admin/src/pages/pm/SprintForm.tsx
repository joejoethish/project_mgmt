import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SprintForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'new';
    
    const [formData, setFormData] = useState({
        name: '', project_id: '', status: 'active', start_date: '', end_date: ''
    });
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/pm/projects/')
            .then(res => setProjects(res.data));

        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/pm/sprints/${id}/`)
                .then(res => {
                    const data = res.data;
                    if(data.start_date) data.start_date = data.start_date.split('T')[0];
                    if(data.end_date) data.end_date = data.end_date.split('T')[0];
                    setFormData(data);
                })
                .catch(() => toast.error('Failed to load sprint'))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/pm/sprints/${id}/`, formData);
                toast.success('Sprint updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/pm/sprints/', formData);
                toast.success('Sprint created');
            }
            navigate('/pm/sprints');
        } catch (error) {
            toast.error('Failed to save sprint');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow mt-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Sprint' : 'New Sprint'}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Sprint Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Project</label>
                    <select value={formData.project_id || ''} onChange={e => setFormData({...formData, project_id: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required>
                        <option value="">Select Project</option>
                        {projects.map((p: any) => (
                            <option key={p.project_id} value={p.project_id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Date</label>
                        <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">End Date</label>
                        <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                     <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="planned">Planned</option>
                     </select>
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/pm/sprints')} className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </form>
        </div>
    );
}

