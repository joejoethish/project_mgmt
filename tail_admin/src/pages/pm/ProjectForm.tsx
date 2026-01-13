import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';
import TagSelector from '../../components/TagSelector';

import { Trash2, Github } from 'lucide-react';

const RepoLinkManager = ({ projectId }: { projectId: string }) => {
    const [linkedRepo, setLinkedRepo] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Fetch only the linked repo for this project
    const fetchLinkedRepo = async () => {
        try {
            const res = await axios.get(`http://192.168.1.26:8000/api/github/repos/?project=${projectId}`);
            setLinkedRepo(res.data.length > 0 ? res.data[0] : null);
        } catch {
            toast.error('Failed to load linked repository');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchLinkedRepo();
    }, [projectId]);

    // Search repos on demand (debounced)
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await axios.get(`http://192.168.1.26:8000/api/github/repos/?search=${encodeURIComponent(searchQuery)}`);
                // Filter out repos already linked to ANY project (optional) or just show all
                setSearchResults(res.data.slice(0, 10)); // Limit to 10 results
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleLink = async (repoId: string) => {
        try {
            await axios.patch(`http://192.168.1.26:8000/api/github/repos/${repoId}/`, {
                project: projectId
            });
            toast.success('Repository linked');
            setSearchQuery('');
            setSearchResults([]);
            fetchLinkedRepo();
        } catch {
            toast.error('Failed to link repository');
        }
    };

    const handleUnlink = async () => {
        if (!linkedRepo || !confirm('Unlink this repository?')) return;
        try {
            await axios.patch(`http://192.168.1.26:8000/api/github/repos/${linkedRepo.repo_id}/`, {
                project: null
            });
            toast.success('Repository unlinked');
            setLinkedRepo(null);
        } catch {
            toast.error('Failed to unlink repository');
        }
    };

    if (loading) return <div className="text-sm text-gray-500">Loading...</div>;

    return (
        <div className="space-y-3">
            {/* Show Linked Repo */}
            {linkedRepo ? (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <Github className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{linkedRepo.full_name}</p>
                            <a href={linkedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                View on GitHub
                            </a>
                        </div>
                    </div>
                    <button type="button" onClick={handleUnlink} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                /* Search & Link */
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Type to search repositories..."
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {searching && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</span>}
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map(repo => (
                                <button
                                    key={repo.repo_id}
                                    type="button"
                                    onClick={() => handleLink(repo.repo_id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Github className="w-4 h-4 text-gray-500" />
                                    <span>{repo.full_name}</span>
                                    {repo.project && <span className="text-xs text-orange-500">(Linked)</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ProjectForm() {
    const { id, projectId } = useParams();
    const navigate = useNavigate();
    const activeId = id || projectId;
    const isEdit = !!activeId && activeId !== 'new';
    
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'active',
        visibility: 'private',
        start_date: '',
        end_date: '',
        owner_member_id: '',
        tag_ids: [] as string[],
        client_type: '',
        project_category: ''
    });
    
    const [clientTypes, setClientTypes] = useState<any[]>([]);
    const [categories, setProjectCategories] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch Dynamic Masters
        axios.get('http://192.168.1.26:8000/api/masters/data/client_type/')
            .then(res => setClientTypes(res.data))
            .catch(err => console.error('Failed to load client types', err));

        axios.get('http://192.168.1.26:8000/api/masters/data/project_category/')
            .then(res => setProjectCategories(res.data))
            .catch(err => console.error('Failed to load categories', err));

        axios.get('http://192.168.1.26:8000/api/pm/members/')
            .then(res => setMembers(res.data))
            .catch(err => console.error('Failed to load members', err));

        if (isEdit) {
            setLoading(true);
            axios.get(`http://192.168.1.26:8000/api/pm/projects/${activeId}/`)
                .then(res => {
                    // Format dates for input type="date"
                    const data = res.data;
                    if (data.start_date) data.start_date = data.start_date.split('T')[0];
                    if (data.end_date) data.end_date = data.end_date.split('T')[0];
                    
                    // Map tags to tag_ids
                    if (data.tags) {
                        data.tag_ids = data.tags.map((t: any) => t.tag_id);
                    } else {
                        data.tag_ids = [];
                    }
                    
                    setFormData(data);
                })
                .catch(() => toast.error('Failed to load project'))
                .finally(() => setLoading(false));
        }
    }, [activeId, isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await axios.put(`http://192.168.1.26:8000/api/pm/projects/${activeId}/`, formData);
                toast.success('Project updated');
            } else {
                await axios.post('http://192.168.1.26:8000/api/pm/projects/', formData);
                toast.success('Project created');
            }
            // Navigate back to project list or dashboard depending on context
            if (projectId) {
                // If we were in nested edit, maybe go back to dashboard
                navigate(`/pm/projects/${projectId}`);
            } else {
                navigate('/pm/projects');
            }
        } catch (error) {
            toast.error('Failed to save project');
            console.error(error);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                {isEdit ? 'Edit Project' : 'New Project'}
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (URL compliant)</label>
                    <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="template">Template</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibility</label>
                        <select
                            name="visibility"
                            value={formData.visibility}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="private">Private</option>
                            <option value="team">Team</option>
                            <option value="public">Public</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Owner</label>
                    <select
                        name="owner_member_id"
                        value={formData.owner_member_id || ''}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Select Owner</option>
                        {members.map(m => (
                            <option key={m.member_id} value={m.member_id}>
                                {m.first_name} {m.last_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Type</label>
                        <select
                            name="client_type"
                            value={formData.client_type || ''}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Client Type</option>
                            {clientTypes.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.data.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Category</label>
                        <select
                            name="project_category"
                            value={formData.project_category || ''}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Category</option>
                            {categories.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.data.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                     <TagSelector
                        selectedTagIds={formData.tag_ids || []}
                        onChange={ids => setFormData({ ...formData, tag_ids: ids })}
                     />
                </div>

                {isEdit && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Linked Repositories</h3>
                        <RepoLinkManager projectId={activeId} />
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(projectId ? `/pm/projects/${projectId}` : '/pm/projects')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {isEdit ? 'Update Project' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
}

