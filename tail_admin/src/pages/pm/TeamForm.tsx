import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function TeamForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id && id !== 'new';
    
    const [formData, setFormData] = useState({
        name: '', description: '', lead_member_id: ''
    });
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axios.get('http://192.168.1.26:8000/api/pm/members/')
            .then(res => setMembers(res.data));

        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/pm/teams/${id}/`)
                .then(res => setFormData(res.data))
                .catch(() => toast.error('Failed to load team'))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/pm/teams/${id}/`, formData);
                toast.success('Team updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/pm/teams/', formData);
                toast.success('Team created');
            }
            navigate('/pm/teams');
        } catch (error) {
            toast.error('Failed to save team');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow mt-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Team' : 'New Team'}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Team Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white" rows={3} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Team Lead</label>
                    <select value={formData.lead_member_id || ''} onChange={e => setFormData({...formData, lead_member_id: e.target.value})} className="w-full rounded border px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                        <option value="">Select Lead</option>
                        {members.map((m: any) => (
                            <option key={m.member_id} value={m.member_id}>{m.first_name} {m.last_name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => navigate('/pm/teams')} className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white dark:border-gray-600">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </form>
        </div>
    );
}

