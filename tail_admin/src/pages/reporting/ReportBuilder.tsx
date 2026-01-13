import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { AdvancedTable, AdvancedTableColumn } from '../../components/tables/AdvancedTable';


// Types
interface DatasetInfo {
  dataset_id: string;
  name: string;
  description: string;
  query_type: string;
  column_count: number;
}

interface DatasetColumn {
  field_name: string;
  display_name: string;
  data_type: string;
  is_filterable: boolean;
}

interface ModelInfo {
  app_label: string;
  model_name: string;
  verbose_name: string;
  full_key: string;
}

interface FieldInfo {
  name: string;
  verbose_name: string;
  type: string;
}

interface Schema {
  fields: FieldInfo[];
  relations: FieldInfo[];
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SavedReport {
  report_id: string;
  name: string;
  description: string;
  dataset?: string;
  primary_model: string;
  columns: string[];
  filters: Record<string, string | number | boolean>;
  is_public?: boolean;
  display_type?: 'table' | 'advanced_table' | 'ag_grid';
  runtime_filters?: string[];
}

const OPERATORS = [
  { value: 'exact', label: '=' },
  { value: 'icontains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'isnull', label: 'is empty' },
];

const DISPLAY_TYPES = [
  { value: 'table', label: 'Standard Table' },
  { value: 'advanced_table', label: 'Advanced Table' },
  { value: 'ag_grid', label: 'Data Grid (AG Grid)' },
];

const API_BASE = 'http://192.168.1.26:8000/api/reporting';

const ReportBuilder = () => {
  const queryClient = useQueryClient();
  
  // Source selection
  const [sourceType, setSourceType] = useState<'dataset' | 'model'>('dataset');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Report config
  const [columns, setColumns] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState('');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [reportName, setReportName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [displayType, setDisplayType] = useState('table');
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [runtimeFilters, setRuntimeFilters] = useState<string[]>([]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // UI
  const [showSidebar, setShowSidebar] = useState(true);

  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Fetch Datasets
  const { data: datasets } = useQuery<DatasetInfo[]>({
    queryKey: ['datasets'],
    queryFn: async () => (await axios.get(`${API_BASE}/datasets/`)).data
  });

  // Fetch Dataset Columns when dataset selected
  const { data: datasetColumns } = useQuery<DatasetColumn[]>({
    queryKey: ['dataset-columns', selectedDatasetId],
    queryFn: async () => {
      if (!selectedDatasetId) return [];
      return (await axios.get(`${API_BASE}/datasets/${selectedDatasetId}/columns/`)).data;
    },
    enabled: !!selectedDatasetId && sourceType === 'dataset'
  });

  // Fetch Models (for legacy/advanced mode)
  const { data: models } = useQuery<ModelInfo[]>({
    queryKey: ['report-models'],
    queryFn: async () => (await axios.get(`${API_BASE}/schema/`)).data
  });

  // Fetch Model Schema
  const { data: modelSchema } = useQuery<Schema | null>({
    queryKey: ['report-schema', selectedModel],
    queryFn: async () => {
      if (!selectedModel) return null;
      return (await axios.get(`${API_BASE}/schema/?model=${selectedModel}`)).data;
    },
    enabled: !!selectedModel && sourceType === 'model'
  });

  // Fetch Saved Reports
  const { data: savedReports } = useQuery<SavedReport[]>({
    queryKey: ['saved-reports'],
    queryFn: async () => (await axios.get(`${API_BASE}/definitions/`)).data
  });

  // Get available fields based on source type (Deduplicated)
  const availableFields = useMemo(() => {
    const rawFields = sourceType === 'dataset' 
      ? (datasetColumns?.map(c => ({ name: c.field_name, label: c.display_name, type: c.data_type })) || [])
      : (modelSchema?.fields.map(f => ({ name: f.name, label: f.verbose_name, type: f.type })) || []);
      
    // Deduplicate by name
    const unique = new Map();
    rawFields.forEach(f => {
        if (!unique.has(f.name)) unique.set(f.name, f);
    });
    return Array.from(unique.values());
  }, [datasetColumns, modelSchema, sourceType]);

  // Save Report
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (selectedReportId) {
        return axios.put(`${API_BASE}/definitions/${selectedReportId}/`, data);
      }
      return axios.post(`${API_BASE}/definitions/`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      setShowSaveModal(false);
      alert('Report saved!');
    }
  });

  // Delete Report
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`${API_BASE}/definitions/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
      setSelectedReportId(null);
    }
  });

  const filteredFields = useMemo(() => {
    return availableFields.filter(f => 
        f.label.toLowerCase().includes(columnSearch.toLowerCase()) || 
        f.name.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [availableFields, columnSearch]);

  const handleColumnToggle = (fieldName: string) => {
    setColumns(prev => 
      prev.includes(fieldName) ? prev.filter(c => c !== fieldName) : [...prev, fieldName]
    );
  };

  const handleSelectAll = () => {
    // Select all currently visible (filtered) columns
    const visibleFieldNames = filteredFields.map(f => f.name);
    // Add only new ones to avoid duplicates (though setColumns usually handles array)
    // Actually we want to ADD visible ones to existing selection.
    setColumns(prev => {
        const unique = new Set([...prev, ...visibleFieldNames]);
        return Array.from(unique);
    });
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === columns.length - 1)) return;
    setColumns(prev => {
        const newCols = [...prev];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newCols[index], newCols[swapIndex]] = [newCols[swapIndex], newCols[index]];
        return newCols;
    });
  };

  const addFilter = () => {
    const firstField = availableFields[0]?.name || '';
    setFilterConditions([...filterConditions, {
      id: Date.now().toString(),
      field: firstField,
      operator: 'exact',
      value: ''
    }]);
  };

  const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
    setFilterConditions(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeFilter = (id: string) => {
    setFilterConditions(prev => prev.filter(f => f.id !== id));
  };

  const buildFiltersObject = () => {
    const filters: Record<string, string | number | boolean> = {};
    filterConditions.forEach(cond => {
      if (cond.field && cond.value !== '') {
        const key = cond.operator === 'exact' ? cond.field : `${cond.field}__${cond.operator}`;
        if (cond.operator === 'isnull') filters[key] = cond.value === 'true';
        else if (['gt', 'gte', 'lt', 'lte'].includes(cond.operator) && !isNaN(Number(cond.value))) filters[key] = Number(cond.value);
        else filters[key] = cond.value;
      }
    });
    return filters;
  };

  const loadReport = (report: SavedReport) => {
    setSelectedReportId(report.report_id);
    setReportName(report.name);
    setColumns(report.columns || []);
    setIsPublic(report.is_public || false);
    setDisplayType(report.display_type || 'table'); // Set display type
    
    if (report.dataset) {
      setSourceType('dataset');
      setSelectedDatasetId(report.dataset);
    } else if (report.primary_model) {
      setSourceType('model');
      setSelectedModel(report.primary_model);
    }
    setRuntimeFilters(report.runtime_filters || []);
    
    const conditions: FilterCondition[] = Object.entries(report.filters || {}).map(([key, val], idx) => {
      const parts = key.split('__');
      return { id: `loaded-${idx}`, field: parts[0], operator: parts[1] || 'exact', value: String(val) };
    });
    setFilterConditions(conditions);
  };

  const [isExplodedView, setIsExplodedView] = useState(false);

  const generatePreview = async () => {
    setPreviewError(null);
    setPreviewData([]);
    setIsExplodedView(false); // Reset
    try {
      const filters = buildFiltersObject();
      const payload = sourceType === 'dataset'
        ? { dataset_id: selectedDatasetId, columns, filters }
        : { primary_model: selectedModel, columns, filters };
      
      const res = await axios.post(`${API_BASE}/preview/`, payload);
      let data = res.data.data;

      // Special handling: Explode submission_data into rows if present
      if (columns.includes('submission_data')) {
         const expanded: Record<string, unknown>[] = [];
         let didExpand = false;

         data.forEach((row: any) => {
            const raw = row['submission_data'];
            let parsed = raw;
            if (typeof raw === 'string') {
                try { parsed = JSON.parse(raw); } catch {}
            }
            
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const entries = Object.entries(parsed);
                if (entries.length > 0) {
                    didExpand = true;
                    entries.forEach(([q, a]) => {
                        // Create new row with Q and A, inheriting other fields
                        expanded.push({
                            ...row,
                            question: q,
                            answer: String(a)
                        });
                    });
                } else {
                    // Empty object, keep original row but blank Q/A
                     expanded.push(row);
                }
            } else {
                // Not expandable, keep original
                expanded.push(row);
            }
         });

         if (didExpand) {
             data = expanded;
             setIsExplodedView(true);
         }
      }

      setPreviewData(data);
    } catch (err: unknown) {
      console.error(err);
      // Extract error message from backend response
      let errorMessage = 'Preview failed. Please check your configuration.';
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setPreviewError(errorMessage);
    }
  };

  const handleSave = () => {
    if (!reportName.trim()) { alert('Enter report name'); return; }
    saveMutation.mutate({
      name: reportName,
      dataset: sourceType === 'dataset' && selectedDatasetId ? selectedDatasetId : null,
      primary_model: sourceType === 'model' && selectedModel ? selectedModel : null,
      columns,
      filters: buildFiltersObject(),
      runtime_filters: runtimeFilters,
      is_public: isPublic,
      display_type: displayType
    });
  };

  const isSourceSelected = sourceType === 'dataset' ? !!selectedDatasetId : !!selectedModel;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b px-8 py-4 flex items-center justify-between shadow-sm shrink-0 z-40">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg text-sm">📊</span>
            Report Builder
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
             {/* Saved Reports Selector */}
             <div className="flex items-center gap-2">
                 <div className="relative group">
                     <select
                        value={selectedReportId || ''}
                        onChange={(e) => {
                           const val = e.target.value;
                           if (!val) {
                               // Reset
                               setSelectedReportId(null);
                               setReportName('');
                               setColumns([]);
                               setFilterConditions([]);
                               setRuntimeFilters([]);
                               setIsPublic(false);
                               setSourceType('dataset');
                               setSelectedDatasetId('');
                               setSelectedModel('');
                           } else {
                               const report = savedReports?.find(r => r.report_id === val);
                               if (report) loadReport(report);
                           }
                        }}
                        className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg pl-3 pr-8 py-2 w-56 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer hover:border-gray-300 transition"
                     >
                        <option value="">+ New Report</option>
                        {savedReports && savedReports.length > 0 && (
                            <optgroup label="Saved Reports">
                                {savedReports.map(r => <option key={r.report_id} value={r.report_id}>{r.name}</option>)}
                            </optgroup>
                        )}
                     </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</div>
                 </div>
                 
                 {selectedReportId && (
                     <button onClick={() => { if (confirm('Delete Report?')) deleteMutation.mutate(selectedReportId); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Report">
                        🗑️
                     </button>
                 )}
             </div>

             <div className="h-6 w-px bg-gray-100 dark:bg-gray-700"></div>

             {/* Actions */}
             <div className="flex gap-3">
                 <button onClick={() => setShowSaveModal(true)} disabled={!isSourceSelected}
                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2">
                     💾 Save
                 </button>
                 
                 {selectedReportId && (
                    <Link to={`/reporting/view/${selectedReportId}`} target="_blank"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition flex items-center gap-2"
                        title="Open in Viewer">
                        ↗️ Open
                    </Link>
                 )}

                 <button onClick={generatePreview} disabled={!isSourceSelected || columns.length === 0}
                     className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none transition disabled:opacity-50 disabled:shadow-none flex items-center gap-2">
                     ▶ Run Preview
                 </button>
             </div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Toggle */}
        <button onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 z-30 p-1.5 bg-white dark:bg-gray-800 border border-l-0 shadow-md hover:bg-gray-50 rounded-r-lg transition-all text-gray-500"
            style={{ left: showSidebar ? '28rem' : '0px' }} // 28rem = w-[28rem]
            title={showSidebar ? 'Collapse sidebar' : 'Expand sidebar'}
        >
            {showSidebar ? '◀' : '▶'}
        </button>

        {/* Left Sidebar: Configuration - Widened for better usability */}
        <div className={`${showSidebar ? 'w-[28rem] translate-x-0' : 'w-0 -translate-x-full opacity-0'} bg-white dark:bg-gray-800 border-r flex flex-col shadow-xl z-20 shrink-0 h-full transition-all duration-300 ease-in-out`}>
          <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700">
            <h2 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              ⚙️ Report Configuration
            </h2>
            <p className="text-xs text-gray-500 mt-1">Configure your data source, columns, and filters</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            {/* Section 1: Data Source */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                Data Source
              </h3>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                  <button onClick={() => { setSourceType('dataset'); setSelectedModel(''); setColumns([]); }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${sourceType === 'dataset' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Datasets
                  </button>
                  <button onClick={() => { setSourceType('model'); setSelectedDatasetId(''); setColumns([]); }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${sourceType === 'model' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Raw Models
                  </button>
                </div>

                {sourceType === 'dataset' ? (
                  <select value={selectedDatasetId} onChange={e => { setSelectedDatasetId(e.target.value); setColumns([]); }}
                    className="w-full p-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a Dataset...</option>
                    {datasets?.map(d => <option key={d.dataset_id} value={d.dataset_id}>{d.name}</option>)}
                  </select>
                ) : (
                  <select value={selectedModel} onChange={e => { setSelectedModel(e.target.value); setColumns([]); }}
                    className="w-full p-2.5 text-sm border rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select a Model...</option>
                    {models?.map(m => <option key={m.full_key} value={m.full_key}>{m.verbose_name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Section 2: Columns - Compact Summary with Expand Button */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">2</span>
                  <span>Report Columns</span>
                </h3>
              </div>

              {isSourceSelected ? (
                <div className="border dark:border-gray-700 rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-800">
                  {/* Header with expand button */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 border-b dark:border-gray-600 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {columns.length > 0 ? (
                          <><span className="text-indigo-600 font-bold">{columns.length}</span> columns selected</>
                        ) : (
                          'No columns selected'
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{availableFields.length} columns available</p>
                    </div>
                    <button 
                      onClick={() => setShowColumnPicker(true)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center gap-2"
                    >
                      📋 {columns.length > 0 ? 'Edit Columns' : 'Select Columns'}
                    </button>
                  </div>
                  
                  {/* Selected columns summary */}
                  {columns.length > 0 ? (
                    <div className="p-3 max-h-48 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {columns.map((colName, idx) => {
                          const field = availableFields.find(f => f.name === colName);
                          return (
                            <span key={colName} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm border border-indigo-200 dark:border-indigo-700">
                              <span className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                              <span className="truncate max-w-32">{field?.label || colName}</span>
                              <button onClick={() => handleColumnToggle(colName)} className="text-indigo-400 hover:text-red-500 transition">×</button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      <p className="text-sm">Click "Select Columns" to choose which fields to include in your report</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
                  <span className="text-2xl block mb-2">📋</span>
                  Select a data source above first
                </div>
              )}
            </div>

            {/* Section 3: Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">3</span>
                  Filters
                </h3>
                <button onClick={addFilter} disabled={!isSourceSelected}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 transition">+ Add New</button>
              </div>

              <div className="space-y-2">
                {filterConditions.map(filter => (
                  <div key={filter.id} className="p-3 bg-white dark:bg-gray-700 border rounded-xl shadow-sm space-y-2 group">
                    <div className="flex justify-between items-start">
                      <select value={filter.field} onChange={e => updateFilter(filter.id, 'field', e.target.value)}
                        className="w-full p-1.5 text-xs font-medium border-b bg-transparent outline-none focus:border-purple-500">
                        {availableFields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                      </select>
                      <button onClick={() => removeFilter(filter.id)} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                    </div>
                    <div className="flex gap-2">
                      <select value={filter.operator} onChange={e => updateFilter(filter.id, 'operator', e.target.value)}
                        className="w-1/3 p-1.5 text-xs border rounded bg-gray-50 dark:bg-gray-800">
                        {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                      </select>
                      <input type="text" value={filter.value} onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder="Value..." className="flex-1 p-1.5 text-xs border rounded bg-white dark:bg-gray-800" />
                    </div>
                  </div>
                ))}
                {filterConditions.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                    No active filters
                  </div>
                )}
              </div>

              {/* Runtime Filters Config */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Runtime Filters (User Configurable)</h4>
                <p className="text-xs text-gray-500 mb-3">Select fields that users can filter by when viewing the report.</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {availableFields.map(f => (
                        <label key={f.name} className={`px-2 py-1 text-xs rounded border cursor-pointer transition select-none ${runtimeFilters.includes(f.name) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                            <input type="checkbox" className="hidden" checked={runtimeFilters.includes(f.name)} 
                                onChange={() => setRuntimeFilters(prev => prev.includes(f.name) ? prev.filter(x => x !== f.name) : [...prev, f.name])} />
                            {f.label}
                        </label>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 p-6 overflow-hidden">
             
          {/* Results Table Card - Using AdvancedTable */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
            {previewData.length > 0 ? (
              <AdvancedTable<Record<string, unknown>>
                data={previewData}
                columns={(() => {
                    // Calculate columns based on view mode
                    let colsToRender = columns;
                    
                    if (isExplodedView) {
                        // Remove submission_data, Add Question/Answer
                        colsToRender = columns.filter(c => c !== 'submission_data');
                    }

                    const mappedCols = colsToRender.map(colName => {
                        const field = availableFields.find(f => f.name === colName);
                        return {
                            key: colName,
                            header: field?.label || colName,
                            sortable: true,
                            // Keep default renderers for normal columns
                        } as AdvancedTableColumn<Record<string, unknown>>;
                    });

                    if (isExplodedView) {
                        mappedCols.push({ key: 'question', header: 'Question', sortable: true });
                        mappedCols.push({ key: 'answer', header: 'Answer', sortable: true });
                    }

                    return mappedCols;
                })()}
                title="Query Results"
                description={`${previewData.length} records found`}
                rowKey="id"
                
                // Enable features
                enableSearch={true}
                enablePagination={true}
                enableExport={true}
                enableExcelExport={true}
                enablePdfExport={true}
                enableColumnVisibility={true}
                enableStickyHeader={true}
                enableColumnResize={true}
                enableSelection={false}
                
                pageSize={25}
                maxHeight="100%"
              />
            ) : previewError ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                 <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-4xl">⚠️</div>
                 <div className="text-center max-w-2xl">
                    <p className="font-semibold text-red-600 dark:text-red-400 text-lg">Preview Failed</p>
                    <p className="text-sm mt-3 text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                      {previewError}
                    </p>
                    <p className="text-xs mt-4 text-gray-500">
                      This usually happens when selected columns don't exist in the dataset or have incorrect paths.
                      Try editing the dataset to fix column definitions, or select different columns.
                    </p>
                    <button 
                      onClick={() => setPreviewError(null)}
                      className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition"
                    >
                      Dismiss
                    </button>
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                 <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-4xl">📊</div>
                 <div className="text-center">
                    <p className="font-medium text-gray-600 dark:text-gray-300">No results to display</p>
                    <p className="text-sm mt-1">Configure your source and columns, then click Run Preview</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Full-Page Column Picker Modal */}
      {showColumnPicker && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                  📋 Select Report Columns
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {availableFields.length} columns available • {columns.length} selected
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowColumnPicker(false)}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition"
                >
                  ✓ Done ({columns.length} columns)
                </button>
                <button 
                  onClick={() => setShowColumnPicker(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Modal Body - Split View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Available Columns */}
              <div className="flex-1 flex flex-col border-r dark:border-gray-700 overflow-hidden">
                {/* Search and Actions */}
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-3">
                  <input 
                    type="text" 
                    value={columnSearch}
                    onChange={e => setColumnSearch(e.target.value)}
                    placeholder="🔍 Search columns..."
                    className="w-full px-4 py-3 text-sm border rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSelectAll} className="flex-1 px-4 py-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition">
                      ✓ Select All Visible
                    </button>
                    <button onClick={() => setColumns([])} className="flex-1 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                      ✕ Clear All
                    </button>
                  </div>
                </div>
                
                {/* Columns Grid - 2 columns for large lists */}
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredFields.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <span className="text-4xl block mb-3">🔍</span>
                      No columns match "{columnSearch}"
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredFields.map(field => (
                        <label 
                          key={field.name} 
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            columns.includes(field.name) 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 shadow-md' 
                              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={columns.includes(field.name)} 
                            onChange={() => handleColumnToggle(field.name)} 
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600" 
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`block text-sm font-semibold truncate ${columns.includes(field.name) ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {field.label}
                            </span>
                            <span className="block text-xs text-gray-400 font-mono truncate">{field.name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg uppercase font-bold shrink-0">
                            {field.type.replace('Field', '')}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right: Selected Columns (Reorderable) */}
              <div className="w-96 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    📌 Selected Columns
                    {columns.length > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{columns.length}</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Drag or use arrows to reorder</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {columns.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <span className="text-4xl block mb-3">📋</span>
                      <p className="text-sm">No columns selected</p>
                      <p className="text-xs mt-1">Check columns on the left to add them</p>
                    </div>
                  ) : (
                    columns.map((colName, idx) => {
                      const field = availableFields.find(f => f.name === colName);
                      return (
                        <div key={colName} className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition group">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{field?.label || colName}</span>
                            <span className="block text-xs text-gray-400 font-mono truncate">{colName}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition">
                            <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-indigo-100 rounded disabled:opacity-30 transition text-sm">⬆️</button>
                            <button onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1} className="p-1 hover:bg-indigo-100 rounded disabled:opacity-30 transition text-sm">⬇️</button>
                            <button onClick={() => handleColumnToggle(colName)} className="p-1 text-red-500 hover:bg-red-100 rounded ml-1 transition text-sm">✕</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 transform scale-100 transition-all">
            <h3 className="text-xl font-bold">Save Report</h3>
            <input
              type="text"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder="Report Name..."
              className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            
            <div className="flex items-center gap-3">
                 <input 
                    type="checkbox"
                    id="is_public"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                 />
                 <label htmlFor="is_public" className="text-gray-700 dark:text-gray-300 font-medium">
                     Public Report (Visible to all users)
                 </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Type</label>
                <div className="flex gap-4">
                  {DISPLAY_TYPES.map(type => (
                    <label key={type.value} className={`flex-1 border rounded-lg p-3 cursor-pointer transition ${displayType === type.value ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="displayType"
                        value={type.value}
                        checked={displayType === type.value}
                        onChange={e => setDisplayType(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-semibold ${displayType === type.value ? 'text-blue-700' : 'text-gray-700'}`}>{type.label}</span>
                          <span className="text-xs text-gray-400">{type.value === 'ag_grid' ? 'Advanced sorting & filtering' : 'Simple tabular view'}</span>
                      </div>
                    </label>
                  ))}
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportBuilder;

