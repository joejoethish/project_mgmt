import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function WorkflowForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'new';
    
    // task_statuses table fields: name, description, sort_order, is_default, is_active
    const [formData, setFormData] = useState({
        name: '', description: '', sort_order: 0, is_default: false, is_active: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/pm/taskstatuses/${id}/`)
                .then(res => setFormData(res.data))
                .catch(() => toast.error('Failed to load status'))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/pm/taskstatuses/${id}/`, formData);
                toast.success('Status updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/pm/taskstatuses/', formData);
                toast.success('Status created');
            }
            navigate('/pm/workflows');
        } catch (error) {
            toast.error('Failed to save status');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow mt-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Workflow Status' : 'New Workflow Status'}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" rows={2} />
                </div>
                <div className="flex gap-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Sort Order</label>
                         <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div className="flex flex-col gap-2 pt-6">
                         <div className="flex items-center">
                             <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2 h-4 w-4" />
                             <label htmlFor="is_active" className="text-sm dark:text-gray-300">Active</label>
                         </div>
                         <div className="flex items-center">
                             <input type="checkbox" id="is_default" checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} className="mr-2 h-4 w-4" />
                             <label htmlFor="is_default" className="text-sm dark:text-gray-300">Default Status</label>
                         </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/pm/workflows')} className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </form>
        </div>
    );
}

