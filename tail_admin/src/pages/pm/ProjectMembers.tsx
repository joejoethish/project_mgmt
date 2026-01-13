import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function ProjectMembers() {
    const { project } = useOutletContext<any>();
    const [projectMembers, setProjectMembers] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newMemberId, setNewMemberId] = useState('');
    const [newRoleId, setNewRoleId] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (!project?.project_id) return;

        const fetchData = async () => {
             // Fetch all needed data
             const [pmRes, membersRes, rolesRes] = await Promise.all([
                 axios.get(`http://192.168.1.26:8000/api/pm/projectmembers/?project_id=${project.project_id}`),
                 axios.get('http://192.168.1.26:8000/api/pm/members/'), // All available members
                 axios.get('http://192.168.1.26:8000/api/pm/roles/')
             ]);
             setProjectMembers(pmRes.data);
             setMembers(membersRes.data);
             setRoles(rolesRes.data);
             setLoading(false);
        };
        fetchData();
    }, [project.project_id]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberId || !newRoleId) return;
        
        setIsAdding(true);
        try {
            const payload = {
                project_id: project.project_id,
                member_id: newMemberId,
                role_id: newRoleId
            };
            const res = await axios.post('http://192.168.1.26:8000/api/pm/projectmembers/', payload);
            setProjectMembers([...projectMembers, res.data]);
            toast.success('Member added');
            setNewMemberId('');
            setNewRoleId('');
        } catch (error) {
            toast.error('Failed to add member');
            console.error(error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveMember = async (id: string) => {
        if (!confirm('Remove member?')) return;
        try {
             await axios.delete(`http://192.168.1.26:8000/api/pm/projectmembers/${id}/`);
             setProjectMembers(projectMembers.filter((pm: any) => pm.project_member_id !== id));
             toast.success('Member removed');
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    if (loading) return <div>Loading members...</div>;

    // Helper to get name
    const getMemberName = (id: string) => {
        const m: any = members.find((m: any) => m.member_id === id);
        return m ? `${m.first_name} ${m.last_name}` : 'Unknown';
    };
    
    const getRoleName = (id: string) => {
        const r: any = roles.find((r: any) => r.role_id === id);
        return r ? r.name : 'Unknown';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Add Team Member</h3>
                <form onSubmit={handleAddMember} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Member</label>
                        <select 
                            value={newMemberId} 
                            onChange={e => setNewMemberId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
                            required
                        >
                            <option value="">Select User</option>
                            {members.map((m: any) => (
                                <option key={m.member_id} value={m.member_id}>
                                    {m.first_name} {m.last_name} ({m.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role</label>
                        <select 
                            value={newRoleId} 
                            onChange={e => setNewRoleId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 dark:text-white"
                            required
                        >
                            <option value="">Select Role</option>
                            {roles.map((r: any) => (
                                <option key={r.role_id} value={r.role_id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isAdding}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isAdding ? 'Adding...' : 'Add'}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3">Variable Name</th>{" "}
                            {/* Wait, simple table headers */}
                            <th className="px-6 py-3">Member</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {projectMembers.map((pm: any) => (
                            <tr key={pm.project_member_id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {getMemberName(pm.member_id)}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
                                        {getRoleName(pm.role_id)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleRemoveMember(pm.project_member_id)}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {projectMembers.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">No members added yet</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

