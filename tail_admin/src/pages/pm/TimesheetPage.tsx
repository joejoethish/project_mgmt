import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

import TimesheetHeader from './TimesheetHeader';
import TimesheetGrid from './TimesheetGrid';

const API_BASE = 'http://192.168.1.26:8000/api/pm';

const TimesheetPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Date range for current view
  const startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch Timesheet Data
  const { data: timesheetData, isLoading } = useQuery({
    queryKey: ['timesheets', startDate, endDate],
    queryFn: async () => {
      const resp = await axios.get(`${API_BASE}/timesheets/weekly_grid/`, {
        params: { start_date: startDate, end_date: endDate },
        withCredentials: true
      });
      return resp.data;
    }
  });

  // Helper to get cookie
  const getCookie = (name: string) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
  };

  // Save Mutation
  // We send bulk updates to the backend
  const saveMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      const resp = await axios.post(`${API_BASE}/timesheets/bulk_update/`, 
        { updates }, 
        { 
          withCredentials: true,
          headers: {
            'X-CSRFToken': getCookie('csrftoken')
          }
        }
      );
      return resp.data;
    },
    onSuccess: () => {
      toast.success('Timesheet saved');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to save timesheet');
    }
  });

  // Auto-fill Mutation
  const autoFillMutation = useMutation({
    mutationFn: async () => {
      const resp = await axios.get(`${API_BASE}/timesheets/suggestions/`, {
        params: { start_date: startDate, end_date: endDate },
        withCredentials: true
      });
      return resp.data;
    },
    onSuccess: (suggestions) => {
      if (suggestions.length === 0) {
        toast('No GitHub activity found for this week.', { icon: 'ℹ️' });
        return;
      }
      
      // We need to apply suggestions to our grid.
      // Since the grid handles local state, we can just save these suggestions directly
      // Or present them for review. For "one-click" experience, let's save them.
      // A better UX would be to show them in the grid as "suggested" (ghosted) but let's just save for MVP.
      
      const updates = suggestions.map((s: any) => ({
        date: s.date,
        project_id: s.project_id,
        task_id: s.task_id,
        hours: s.hours,
        description: s.description
      }));
      
      saveMutation.mutate(updates);
      toast.success(`Auto-filled ${suggestions.length} entries from GitHub!`);
    },
    onError: () => {
      toast.error('Failed to fetch GitHub activity');
    }
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <TimesheetHeader 
        currentDate={currentDate} 
        onDateChange={setCurrentDate} 
        onAutoFill={() => autoFillMutation.mutate()}
        isAutoFilling={autoFillMutation.isPending}
      />
      
      <TimesheetGrid 
        currentDate={currentDate}
        data={timesheetData}
        isLoading={isLoading}
        onSave={async (updates) => saveMutation.mutateAsync(updates)}
      />
    </div>
  );
};

export default TimesheetPage;
