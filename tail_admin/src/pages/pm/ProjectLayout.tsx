import { useState, useEffect } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ProjectLayout() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        
        axios.get(`http://192.168.1.26:8000/api/pm/projects/${projectId}/`)
            .then(res => setProject(res.data))
            .catch(() => {
                toast.error('Project not found');
                navigate('/pm/projects');
            })
            .finally(() => setLoading(false));
    }, [projectId, navigate]);

    if (loading) return <div className="p-6">Loading project...</div>;
    if (!project) return null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 min-h-screen">
            {/* Project Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                            {project.name}
                            <span className={`text-xs px-2 py-1 rounded-full border ${
                                project.status === 'active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}>
                                {project.status}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                            Invite Member
                        </button>
                        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                            Settings
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 text-sm font-medium">
                    <NavLink 
                        to={`/pm/projects/${projectId}`} 
                        end
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        Overview
                    </NavLink>
                    <NavLink 
                        to={`/pm/projects/${projectId}/board`} 
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        Board
                    </NavLink>
                    <NavLink 
                        to={`/pm/projects/${projectId}/list`} 
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        List
                    </NavLink>
                    <NavLink 
                        to={`/pm/projects/${projectId}/members`} 
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        Members
                    </NavLink>
                    <NavLink 
                        to={`/pm/projects/${projectId}/files`} 
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        Files
                    </NavLink>
                    <NavLink 
                        to={`/pm/projects/${projectId}/edit`} 
                        className={({ isActive }) => 
                            `pb-2 border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`
                        }
                    >
                        Edit
                    </NavLink>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
                <Outlet context={{ project }} />
            </div>
        </div>
    );
}

