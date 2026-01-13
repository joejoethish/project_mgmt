import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

interface TimesheetGridProps {
  currentDate: Date;
  onSave: (updates: any[]) => Promise<void>;
  isLoading: boolean;
  data: any; // Raw data from API
}

const TimesheetGrid = ({ currentDate, onSave, isLoading, data }: TimesheetGridProps) => {
  const [gridData, setGridData] = useState<any[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, any>>({});

  // Generate days for the week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (data) {
      setGridData(data.rows || []);
      setTotals(data.daily_totals || {});
    }
  }, [data]);

  const handleInputChange = (rowIndex: number, dateStr: string, value: string) => {
     const cleanValue = value === '' ? 0 : parseFloat(value);
     if (isNaN(cleanValue)) return;

     const newGrid = [...gridData];
     const row = newGrid[rowIndex];
     
     // Update local state
     if (!row.entries[dateStr]) row.entries[dateStr] = { hours: 0, ids: [] };
     row.entries[dateStr].hours = cleanValue;
     
     setGridData(newGrid);

     // Mark for save
     const updateKey = `${row.project_id}_${row.task_id}_${dateStr}`;
     setUnsavedChanges(prev => ({
       ...prev,
       [updateKey]: {
         date: dateStr,
         project_id: row.project_id,
         task_id: row.task_id,
         hours: cleanValue,
         description: row.entries[dateStr].description
       }
     }));
     
     // Recalc totals locally (simplified)
     // In a real app we'd sum columns dynamically
  };

  const saveChanges = async () => {
    if (Object.keys(unsavedChanges).length === 0) return;
    
    setIsSaving(true);
    try {
      await onSave(Object.values(unsavedChanges));
      setUnsavedChanges({});
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header Row */}
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

        {/* Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
           {gridData.length === 0 ? (
               <div className="p-12 text-center text-gray-500">
                   No timesheet entries yet. Start by adding a task or using Auto-fill.
               </div>
           ) : gridData.map((row, idx) => (
             <div key={idx} className="grid grid-cols-[300px_1fr] hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
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
                   <div className="font-medium text-gray-900 dark:text-white truncate" title={row.task_title}>{row.task_title}</div>
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
                   <div className="text-xs text-gray-500 truncate" title={row.project_name}>{row.project_name}</div>
                 )}
               </div>
               
               {/* Days */}
               <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700">
                 {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const entry = row.entries[dateStr];
                    const hours = entry ? entry.hours : '';
                    
                    return (
                      <div key={dateStr} className="relative p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className={`w-full h-full text-center bg-transparent focus:bg-white dark:focus:bg-gray-800 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium ${
                            hours > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                          }`}
                          placeholder="-"
                          value={hours === 0 ? '' : hours}
                          onChange={(e) => handleInputChange(idx, dateStr, e.target.value)}
                        />
                      </div>
                    );
                 })}
               </div>
             </div>
           ))}
        </div>
        
        {/* Footer Actions */}
        {Object.keys(unsavedChanges).length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50 animate-fade-in-up">
            <span className="text-sm font-medium">{Object.keys(unsavedChanges).length} unsaved changes</span>
            <button 
              onClick={saveChanges}
              disabled={isSaving}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-full transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default TimesheetGrid;
