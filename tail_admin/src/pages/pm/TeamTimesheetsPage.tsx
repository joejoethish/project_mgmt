import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';

const API_BASE = 'http://192.168.1.26:8000/api/pm';

interface Member {
  member_id: string;
  first_name: string;
  last_name: string;
}

const TeamTimesheetsPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Date range for current view
  const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Generate days for the week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch Members list
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['members-list'],
    queryFn: async () => {
      const resp = await axios.get(`${API_BASE}/members/`, { withCredentials: true });
      return resp.data.results || resp.data;
    }
  });

  // Fetch Timesheet for selected member
  const { data: timesheetData, isLoading: timesheetLoading, error } = useQuery({
    queryKey: ['team-timesheet', selectedMemberId, startDate, endDate],
    queryFn: async () => {
      const resp = await axios.get(`${API_BASE}/timesheets/team_grid/`, {
        params: { member_id: selectedMemberId, start_date: startDate, end_date: endDate },
        withCredentials: true
      });
      return resp.data;
    },
    enabled: !!selectedMemberId
  });

  // Auto-select first member when loaded
  if (members.length > 0 && !selectedMemberId) {
    setSelectedMemberId(members[0].member_id);
  }

  const prevWeek = () => setCurrentDate(d => addDays(d, -7));
  const nextWeek = () => setCurrentDate(d => addDays(d, 7));

  const gridData = timesheetData?.rows || [];
  const memberInfo = timesheetData?.member;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Team Timesheets</h1>
          
          {/* Member Selector */}
          <select
            value={selectedMemberId || ''}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white min-w-[200px]"
          >
            {membersLoading ? (
              <option>Loading...</option>
            ) : (
              members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.first_name} {m.last_name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
          <button onClick={prevWeek} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition">
            ◀
          </button>
          <span className="font-medium text-gray-700 dark:text-gray-200 min-w-[160px] text-center">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <button onClick={nextWeek} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition">
            ▶
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">🚫</div>
            <p className="text-red-600 dark:text-red-400 font-medium">Permission Denied</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              You don't have permission to view team timesheets.
            </p>
          </div>
        ) : timesheetLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Member Info Bar */}
            {memberInfo && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 px-6 py-3 border-b flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                  {memberInfo.first_name?.[0]}{memberInfo.last_name?.[0]}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {memberInfo.first_name} {memberInfo.last_name}
                  </div>
                  <div className="text-xs text-gray-500">Viewing timesheet</div>
                </div>
              </div>
            )}

            {/* Grid Header */}
            <div className="grid grid-cols-[300px_1fr] border-b border-gray-200 dark:border-gray-700 font-medium text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
              <div className="p-4 border-r border-gray-200 dark:border-gray-700">Task / Project</div>
              <div className="grid grid-cols-7">
                {weekDays.map(day => (
                  <div key={day.toISOString()} className={`p-4 text-center border-l first:border-l-0 ${isSameDay(day, new Date()) ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                    <div className="text-xs uppercase mb-1">{format(day, 'EEE')}</div>
                    <div className="text-lg">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {gridData.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No timesheet entries for this week.
                </div>
              ) : gridData.map((row: any, idx: number) => (
                <div key={idx} className="grid grid-cols-[300px_1fr] hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  {/* Task Info */}
                  <div className="p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center">
                    {row.task_id && row.project_id ? (
                      <Link 
                        to={`/pm/projects/${row.project_id}/tasks/${row.task_id}`}
                        className="font-medium text-gray-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition" 
                        title={`Open: ${row.task_title}`}
                      >
                        {row.task_title} ↗
                      </Link>
                    ) : (
                      <div className="font-medium text-gray-900 dark:text-white truncate">{row.task_title}</div>
                    )}
                    {row.project_id ? (
                      <Link 
                        to={`/pm/projects/${row.project_id}`}
                        className="text-xs text-gray-500 truncate hover:text-indigo-500 transition" 
                        title={`Go to: ${row.project_name}`}
                      >
                        {row.project_name}
                      </Link>
                    ) : (
                      <div className="text-xs text-gray-500 truncate">{row.project_name}</div>
                    )}
                  </div>
                  
                  {/* Days (read-only) */}
                  <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const entry = row.entries[dateStr];
                      const hours = entry ? entry.hours : '';
                      
                      return (
                        <div key={dateStr} className="p-3 text-center">
                          <span className={`font-medium ${hours > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                            {hours > 0 ? hours : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Footer */}
            {gridData.length > 0 && (
              <div className="grid grid-cols-[300px_1fr] bg-gray-50 dark:bg-gray-800/50 border-t font-medium">
                <div className="p-4 border-r border-gray-200 dark:border-gray-700 text-gray-600">Daily Total</div>
                <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const total = timesheetData?.daily_totals?.[dateStr] || 0;
                    return (
                      <div key={dateStr} className="p-3 text-center text-indigo-600 dark:text-indigo-400">
                        {total > 0 ? `${total}h` : '-'}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamTimesheetsPage;
