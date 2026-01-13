import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function TeamsList() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleDelete = async (id: string) => {
    if(!confirm('Delete team?')) return;
    try {
        await axios.delete(`http://192.168.1.26:8000/api/pm/teams/${id}/`);
        setTeams(teams.filter((t: any) => t.team_id !== id));
        toast.success('Team deleted');
    } catch (e) {
        toast.error('Failed to delete');
    }
  };


  useEffect(() => {
    axios.get("http://192.168.1.26:8000/api/pm/teams/")
      .then((res) => setTeams(res.data))
      .catch(() => toast.error("Failed to load teams"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
        <button onClick={() => navigate('/pm/teams/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Team
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3">Team Name</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {teams.map((team: any) => (
              <tr key={team.team_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{team.name}</td>
                <td className="px-6 py-4">{team.description}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => navigate(`/pm/teams/${team.team_id}`)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button onClick={() => handleDelete(team.team_id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={3} className="text-center py-4">Loading...</td></tr>}
            {!loading && teams.length === 0 && (
                <tr><td colSpan={3} className="text-center py-4">No teams found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

