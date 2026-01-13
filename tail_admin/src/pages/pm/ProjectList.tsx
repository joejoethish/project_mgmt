import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import toast from "react-hot-toast";
import TagFilter from "../../components/TagFilter";
import ImportModal from "../../components/ImportModal";

interface Project {
  project_id: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
  start_date: string;
  end_date: string;
  owner_member?: {
    first_name: string;
    last_name: string;
  };
  client_type_details?: {
    name: string;
  };
  tags?: {
    tag_id: string;
    name: string;
    color: string;
  }[];
}

export default function ProjectList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`http://192.168.1.26:8000/api/pm/projects/${filterTags.length ? '?tags=' + filterTags.join(',') : ''}`)
      .then((res) => setProjects(res.data))
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }, [filterTags]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"?`)) return;
    try {
      await axios.delete(`http://192.168.1.26:8000/api/pm/projects/${id}/`);
      toast.success("Project deleted");
      setProjects(projects.filter((p) => p.project_id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Projects
        </h1>
        <div className="flex gap-3">
             <TagFilter
                selectedTagIds={filterTags}
                onChange={setFilterTags}
             />
             <button
               onClick={() => setShowImport(true)}
               className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
               </svg>
               Import
             </button>
             <button
              onClick={() => navigate("/pm/projects/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + New Project
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No projects found.</p>
          <button
            onClick={() => navigate("/pm/projects/new")}
            className="mt-4 text-blue-600 hover:underline"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Visibility</th>
                <th className="px-6 py-3">Timeline</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {projects.map((project) => (
                <tr
                  key={project.project_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col cursor-pointer hover:text-blue-600 transition" onClick={() => navigate(`/pm/projects/${project.project_id}`)}>
                      <span>{project.name}</span>
                      <div className="flex gap-1 mt-1">
                        {project.tags?.map(tag => (
                          <span key={tag.tag_id} className="w-2 h-2 rounded-full" style={{backgroundColor: tag.color}} title={tag.name}/>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {project.slug}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {project.client_type_details?.name || '-'}
                        </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${
                                              project.status === "active"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                : project.status === "archived"
                                                ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                            }`}
                    >
                      {project.status || "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{project.visibility}</td>
                  <td className="px-6 py-4 text-xs">
                    {new Date(project.start_date).toLocaleDateString()} -{" "}
                    {new Date(project.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pm/projects/${project.project_id}/edit`);
                      }}
                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(project.project_id, project.name)
                      }
                      className="font-medium text-red-600 dark:text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {
          setShowImport(false);
          // Reload projects
          axios.get(`http://192.168.1.26:8000/api/pm/projects/`)
            .then(res => setProjects(res.data));
        }}
        title="Import Projects"
        importEndpoint="http://192.168.1.26:8000/api/pm/import/projects/"
        templateEndpoint="http://192.168.1.26:8000/api/pm/import/projects/"
      />
    </div>
  );
}

