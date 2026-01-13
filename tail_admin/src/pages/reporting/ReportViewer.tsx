import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Toaster, toast } from 'react-hot-toast';
import { DataGrid } from '../../components/ui/DataGrid';
import { AdvancedTable, AdvancedTableColumn } from '../../components/tables/AdvancedTable';

// Types

// Types
interface DatasetColumn {
  field_name: string;
  display_name: string;
  data_type: string;
  choices?: { value: string; label: string }[];
  related_model?: string;
}

interface FieldInfo {
    name: string;
    label: string;
    type: string;
    related_model?: string;
    choices?: { value: string; label: string }[];
}

interface SavedReport {
  report_id: string;
  name: string;
  description: string;
  dataset?: string;
  dataset_model?: string;
  primary_model: string;
  columns: string[];
  filters: Record<string, string | number | boolean>;
  runtime_filters?: string[];
  display_type?: 'table' | 'advanced_table' | 'ag_grid';
}

const API_BASE = 'http://192.168.1.26:8000/api/reporting';

// Helper Component for Filter Inputs
const FilterInput = ({ field, value, onChange, secondaryValue, onSecondaryChange, modelName, onEnter }: { 
    field: FieldInfo; 
    value: string; 
    onChange: (val: string) => void; 
    secondaryValue?: string;
    onSecondaryChange?: (val: string) => void;
    modelName?: string;
    onEnter?: () => void;
}) => {
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onEnter) {
            onEnter();
        }
    };
    
    // Determine query key
    // If related_model is explicit, use it (for FKs).
    // If text field (no related_model), use root model + field name to fetch distinct values.
    const queryKey = field.related_model 
      ? ['options', field.related_model] 
      : ['options', modelName, field.name];
      
    // Fetch options
    const { data: options } = useQuery<{value: string, label: string}[]>({
        queryKey,
        queryFn: async () => {
            if (field.related_model) {
                return (await axios.get(`${API_BASE}/options/?model=${field.related_model}`)).data;
            }
            if (modelName) {
                // Fetch distinct values for this field
                return (await axios.get(`${API_BASE}/options/?model=${modelName}&field=${field.name}`)).data;
            }
            return [];
        },
        enabled: !!field.related_model || (!!modelName && field.type !== 'date' && field.type !== 'datetime' && !field.choices),
        staleTime: 5 * 60 * 1000
    });

    const isSelect = !!field.choices || !!field.related_model;
    const allOptions = field.choices || options || [];
    const listId = `list-${field.name}`;

    if (field.type === 'date' || field.type === 'datetime') {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">From</span>
                    <input type="date" value={value} onChange={e => onChange(e.target.value)}
                        className="flex-1 text-sm border rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">To</span>
                    <input type="date" value={secondaryValue || ''} onChange={e => onSecondaryChange?.(e.target.value)}
                        className="flex-1 text-sm border rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
            </div>
        );
    }
    
    if (field.type === 'boolean') {
        return (
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
            </select>
        );
    }

    if (isSelect) {
         return (
            <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Any</option>
                {allOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
         );
    }

    return (
        <div className="relative">
            <input type="text" value={value} onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                list={listId}
                placeholder={`Filter ${field.label || field.name}...`}
                className="w-full text-sm border rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-1 focus:ring-indigo-500" />
            
            {allOptions.length > 0 && (
                <datalist id={listId}>
                    {allOptions.map((opt, idx) => (
                        <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                </datalist>
            )}
        </div>
    );
};

const ReportViewer = () => {
  const { id } = useParams<{ id: string }>();
  
  // State
  const [report, setReport] = useState<SavedReport | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch Report Definition
  useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/definitions/${id}/`);
      const data = res.data;
      setReport(data);
      
      // Initialize filters (keep defaults, but runtime ones start empty typically unless explicitly saved?)
      // Actually, we preserve saving filters logic from builder, but we might want to CLEAR runtime-specific ones if we want fresh start?
      // For now, load existing defaults.
      const initialFilters: FilterCondition[] = Object.entries(data.filters || {}).map(([key, val], idx) => {
        const parts = key.split('__');
        return { 
          id: `init-${idx}`, 
          field: parts[0], 
          operator: parts[1] || 'exact', 
          value: String(val) 
        };
      });
      setFilters(initialFilters);
      setAutoRun(true); // Trigger initial run
      return data;
    },
    enabled: !!id
  });

  // Fetch Schema/Columns for Filters
  const { data: datasetColumns } = useQuery<DatasetColumn[]>({
    queryKey: ['dataset-columns', report?.dataset],
    queryFn: async () => (await axios.get(`${API_BASE}/datasets/${report?.dataset}/columns/`)).data,
    enabled: !!report?.dataset
  });

  const { data: modelSchema } = useQuery<Schema>({
    queryKey: ['model-schema', report?.primary_model],
    queryFn: async () => (await axios.get(`${API_BASE}/schema/?model=${report?.primary_model}`)).data,
    enabled: !!report?.primary_model && !report?.dataset
  });

  // Calculate Available Fields for Filter Dropdown
  const availableFields = useMemo(() => {
    const rawFields = report?.dataset
      ? (datasetColumns?.map(c => ({ name: c.field_name, label: c.display_name, type: c.data_type })) || [])
      : (modelSchema?.fields.map(f => ({ name: f.name, label: f.verbose_name, type: f.type })) || []);
      
    const unique = new Map<string, FieldInfo>();
    rawFields.forEach((f: any) => {
        if (!unique.has(f.name)) unique.set(f.name, f as FieldInfo); 
    });
    return Array.from(unique.values());
  }, [datasetColumns, modelSchema, report]);

  // Execute Query
  const runReport = useCallback(async () => {
    if (!report) return;
    setIsLoading(true);
    try {
      // Build filters object
      const filterObj: Record<string, string | number | boolean> = {};
      filters.forEach(f => {
         if (!f.field) return;
         const key = f.operator === 'exact' ? f.field : `${f.field}__${f.operator}`;
         filterObj[key] = f.value;
      });

      const payload = report.dataset
        ? { dataset_id: report.dataset, columns: report.columns, filters: filterObj }
        : { primary_model: report.primary_model, columns: report.columns, filters: filterObj };
      
      const res = await axios.post(`${API_BASE}/preview/`, payload);
      setPreviewData(res.data.data);
      // toast.success('Data refreshed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to run report');
    } finally {
      setIsLoading(false);
    }
  }, [report, filters]);

  // Global Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Run Report: Ctrl+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runReport();
      }
      // Toggle Filters: Ctrl+/ or Ctrl+B
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === 'b')) {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runReport]);

  useEffect(() => {
    if (autoRun && report && availableFields.length > 0) {
        runReport();
        setAutoRun(false);
    }
  }, [autoRun, report, availableFields]);

  // Update specific filter in state
  const updateFilterValue = (field: string, operator: string, value: string) => {
    setFilters(prev => {
       const cleaned = prev.filter(f => !(f.field === field && f.operator === operator));
       if (value) {
          return [...cleaned, { id: `${field}-${operator}`, field, operator, value }];
       }
       return cleaned;
    });
  };

  const getFilterValue = (field: string, operator: string) => {
      return filters.find(f => f.field === field && f.operator === operator)?.value || '';
  };

  // Export CSV
  const exportToCSV = () => {
    if (!report) return;
    const headers = report.columns.join(',');
    const rows = previewData.map(row => 
      report.columns.map(col => `"${row[col] || ''}"`).join(',')
    ).join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + headers + "\n" + rows));
    link.setAttribute("download", `${report.name || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!report) return <div className="h-full flex items-center justify-center text-gray-500">Loading viewer...</div>;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* 1. Header - Minimalist */}
      <div className="h-14 border-b px-6 flex items-center justify-between bg-white dark:bg-gray-800 shrink-0 z-20 relative">
        <div className="flex items-center gap-4">
             <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{report.name}</h1>
                {/* <p className="text-xs text-gray-400 leading-none">{previewData.length} results</p> */}
             </div>
        </div>
        <div className="flex items-center gap-2">
             <span className="text-xs text-gray-400 mr-2">{previewData.length} records</span>
             
             <button onClick={() => setShowFilters(!showFilters)} 
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                title="Toggle Filter Sidebar"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {filters.length > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">{filters.length}</span>}
             </button>

             <div className="h-4 w-px bg-gray-200 mx-1"></div>

             <button onClick={runReport} disabled={isLoading} className="p-2 text-gray-500 hover:text-blue-600 transition" title="Refresh">
                🔄
             </button>
             <button onClick={exportToCSV} disabled={previewData.length === 0} className="p-2 text-gray-500 hover:text-green-600 transition" title="Export CSV">
                📥
             </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
          
          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-gray-50/30 dark:bg-gray-900/50">
               {previewData.length > 0 ? (
                 report.display_type === 'ag_grid' ? (
                   <div className="h-full w-full">
                     <DataGrid
                        rowData={previewData}
                        columns={report.columns}
                        pagination={true}
                     />
                   </div>
                 ) : report.display_type === 'advanced_table' ? (
                   <AdvancedTable<Record<string, unknown>>
                     data={previewData}
                     columns={report.columns.map(colName => ({
                       key: colName,
                       header: colName,
                       sortable: true,
                     } as AdvancedTableColumn<Record<string, unknown>>))}
                     title={report.name}
                     description={`${previewData.length} records`}
                     rowKey="id"
                     enableSearch={true}
                     enablePagination={true}
                     enableExport={true}
                     enableExcelExport={true}
                     enablePdfExport={true}
                     enableColumnVisibility={true}
                     enableStickyHeader={true}
                     enableColumnResize={true}
                     enableSelection={false}
                     pageSize={50}
                     maxHeight="100%"
                   />
                 ) : (
                 <table className="w-full text-sm text-left border-collapse">
                   <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sticky top-0 shadow-sm z-10">
                     <tr>
                       <th className="p-3 w-12 text-center font-medium border-b dark:border-gray-700">#</th>
                       {report.columns.map(col => <th key={col} className="p-3 font-medium border-b dark:border-gray-700 whitespace-nowrap">{col}</th>)}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                     {previewData.map((row, idx) => (
                       <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-gray-800 transition-colors">
                         <td className="p-3 text-center text-xs text-gray-400 bg-gray-50/30 dark:bg-gray-800/30">{idx + 1}</td>
                         {report.columns.map(col => <td key={col} className="p-3 max-w-xs truncate border-b border-gray-50 dark:border-gray-800" title={String(row[col])}>{String(row[col] ?? '')}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 )
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                    <span className="text-4xl opacity-50">📊</span>
                    <p>No data available</p>
                 </div>
               )}
          </div>

          {/* Filter Sidebar (Slide-over) */}
          <div className={`absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-l shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="h-full flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-semibold text-gray-800 dark:text-white">Filter Report</h3>
                      <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      {(!report.runtime_filters || report.runtime_filters.length === 0) && (
                          <div className="text-center text-gray-400 text-sm py-8 italic">
                              No user-configurable filters defined for this report.
                              <br/>
                              <span className="text-xs opacity-75">Edit report settings to add them.</span>
                          </div>
                      )}

                      {report.runtime_filters?.map(fieldName => {
                          const field = availableFields.find(f => f.name === fieldName);
                          if (!field) return null;

                          return (
                              <div key={fieldName} className="space-y-1.5">
                                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{field.label}</label>
                                  <FilterInput 
                                    field={field} 
                                    value={getFilterValue(fieldName, (field.type === 'date' || field.type === 'datetime') ? 'gte' : (!!field.choices || !!field.related_model ? 'exact' : 'icontains'))}
                                    onChange={(val) => updateFilterValue(fieldName, (field.type === 'date' || field.type === 'datetime') ? 'gte' : (!!field.choices || !!field.related_model ? 'exact' : 'icontains'), val)}
                                    secondaryValue={getFilterValue(fieldName, 'lte')}
                                    onSecondaryChange={(val) => updateFilterValue(fieldName, 'lte', val)}
                                    modelName={report?.primary_model || report?.dataset_model}
                                    onEnter={runReport}
                                  />
                              </div>
                          );
                      })}
                  </div>

                  <div className="p-4 border-t bg-gray-50/50 flex gap-2">
                      <button onClick={() => setFilters([])} className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition">Clear All</button>
                      <button onClick={runReport} className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-medium">Apply Filters</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ReportViewer;

