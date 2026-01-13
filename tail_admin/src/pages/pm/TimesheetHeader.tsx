import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar 
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

interface TimesheetHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAutoFill: () => void;
  isAutoFilling: boolean;
}

const TimesheetHeader = ({ currentDate, onDateChange, onAutoFill, isAutoFilling }: TimesheetHeaderProps) => {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          Timesheets
        </h1>
        
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button 
            onClick={() => onDateChange(subWeeks(currentDate, 1))}
            className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="px-4 text-sm font-medium text-gray-700 dark:text-gray-200 w-48 text-center">
            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
          </span>
          
          <button 
            onClick={() => onDateChange(addWeeks(currentDate, 1))}
            className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md transition text-gray-600 dark:text-gray-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAutoFill}
          disabled={isAutoFilling}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg text-sm font-medium transition border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
        >
          {isAutoFilling ? (
             <>
               <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
               Fetching GitHub Activity...
             </>
          ) : (
             <>
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
               </svg>
               Auto-fill from GitHub
             </>
          )}
        </button>
        
        {/* Save button logic will be handled in Grid, or we can trigger it from here via context/props */}
      </div>
    </div>
  );
};

export default TimesheetHeader;
