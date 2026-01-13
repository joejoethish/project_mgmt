import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Lazy load ERD View to avoid loading ReactFlow when not needed
const DatasetERDView = lazy(() => import('../../components/reporting/DatasetERDView'));

interface Dataset {
  dataset_id: string;
  name: string;
  description: string;
  query_type: 'orm' | 'sql';
  primary_model: string;
  sql_query: string;
  joins: string[];
  is_active: boolean;
  column_count?: number;
}

interface DatasetColumn {
  column_id?: string;
  field_name: string;
  display_name: string;
  data_type: string;
  is_visible: boolean;
  is_filterable: boolean;
  sort_order: number;
}

interface ModelInfo {
  full_key: string;
  verbose_name: string;
  app_label: string;
}

interface SchemaField {
  name: string;
  path: string;
  verbose_name: string;
  type: string;
  is_relation?: boolean;
  source_model?: string;
}

interface Relation { name: string; verbose_name: string; related_model: string; }
interface ModelSchema { model: string; fields: SchemaField[]; relations: Relation[]; all_fields: SchemaField[]; }
interface DetectedColumn { name: string; type: string; }

const API_BASE = 'http://192.168.1.26:8000/api/reporting';

const DatasetBuilder = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [formData, setFormData] = useState<Partial<Dataset>>({
    name: '', description: '', query_type: 'sql', primary_model: '', sql_query: '', joins: [],
  });
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // ORM modes: 'select' = manual checkboxes, 'auto' = auto-expand, 'erd' = visual diagram
  const [ormMode, setOrmMode] = useState<'select' | 'auto' | 'erd'>('select');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Fetch datasets
  const { data: datasets, refetch: refetchDatasets } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: async () => (await axios.get(`${API_BASE}/datasets/`)).data
  });

  // Fetch all models
  const { data: models } = useQuery<ModelInfo[]>({
    queryKey: ['models'],
    queryFn: async () => (await axios.get(`${API_BASE}/schema/`)).data
  });

  const filteredModels = useMemo(() => {
    if (!modelSearch || !models) return models || [];
    const search = modelSearch.toLowerCase();
    return models.filter(m => m.verbose_name.toLowerCase().includes(search) || m.full_key.toLowerCase().includes(search));
  }, [models, modelSearch]);

  // Group models by app with selected at top
  const groupedByApp = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    const appLabels: Record<string, string> = {
      'pm': '📊 Project Management',
      'hr': '👥 Human Resources',
      'auth': '🔐 Authentication',
      'masters': '📋 Masters',
      'reporting': '📈 Reporting'
    };
    
    filteredModels.forEach(m => {
      const category = appLabels[m.app_label] || `📁 ${m.app_label.toUpperCase()}`;
      if (!groups[category]) groups[category] = [];
      groups[category].push(m);
    });
    
    // Sort groups with selected models first
    return Object.entries(groups).sort((a, b) => {
      const aHasSelected = a[1].some(m => selectedModels.includes(m.full_key));
      const bHasSelected = b[1].some(m => selectedModels.includes(m.full_key));
      if (aHasSelected && !bHasSelected) return -1;
      if (!aHasSelected && bHasSelected) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredModels, selectedModels]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Fetch schema for primary model (auto mode)
  const { data: primarySchema } = useQuery<ModelSchema | null>({
    queryKey: ['model-schema', formData.primary_model],
    queryFn: async () => {
      if (!formData.primary_model) return null;
      return (await axios.get(`${API_BASE}/schema/?model=${formData.primary_model}`)).data;
    },
    enabled: !!formData.primary_model && formData.query_type === 'orm' && ormMode === 'auto'
  });

  // Fetch schemas for ALL selected models (select mode)
  const { data: selectedSchemas } = useQuery<Record<string, ModelSchema>>({
    queryKey: ['selected-schemas', selectedModels],
    queryFn: async () => {
      const schemas: Record<string, ModelSchema> = {};
      for (const modelKey of selectedModels) {
        const res = await axios.get(`${API_BASE}/schema/?model=${modelKey}`);
        schemas[modelKey] = res.data;
      }
      return schemas;
    },
    enabled: selectedModels.length > 0 && formData.query_type === 'orm' && ormMode === 'select'
  });

  // Fetch columns for selected dataset
  const { data: datasetColumns, refetch: refetchColumns } = useQuery<DatasetColumn[]>({
    queryKey: ['dataset-columns', selectedDataset?.dataset_id],
    queryFn: async () => {
      if (!selectedDataset) return [];
      return (await axios.get(`${API_BASE}/datasets/${selectedDataset.dataset_id}/columns/`)).data;
    },
    enabled: !!selectedDataset
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Dataset>) => {
      const payload = { ...data };
      if (ormMode === 'select' && selectedModels.length > 0) {
        payload.primary_model = selectedModels[0];
        payload.joins = selectedModels.slice(1);
      }
      if (selectedDataset) return axios.put(`${API_BASE}/datasets/${selectedDataset.dataset_id}/`, payload);
      return axios.post(`${API_BASE}/datasets/`, payload);
    },
    onSuccess: (response) => {
      refetchDatasets();
      if (!selectedDataset && response.data.dataset_id) setSelectedDataset(response.data);
      alert('Dataset saved!');
    }
  });

  const addColumnMutation = useMutation({
    mutationFn: async (col: Partial<DatasetColumn>) => axios.post(`${API_BASE}/datasets/${selectedDataset?.dataset_id}/add_column/`, col),
    onSuccess: () => refetchColumns()
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => axios.delete(`${API_BASE}/columns/${columnId}/`),
    onSuccess: () => refetchColumns()
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`${API_BASE}/datasets/${id}/`),
    onSuccess: () => { refetchDatasets(); newDataset(); }
  });

  // Get available fields with proper path generation for nested relations
  const getAvailableFields = (): SchemaField[] => {
    if (ormMode === 'auto' && primarySchema) {
      return (primarySchema.all_fields || []).map(f => ({ ...f, source_model: formData.primary_model }));
    }
    if (ormMode === 'select' && selectedSchemas && selectedModels.length > 0) {
      const fields: SchemaField[] = [];
      const primaryModel = selectedModels[0];
      const joinedModelKeys = new Set(selectedModels.slice(1));
      
      const primarySchema = selectedSchemas[primaryModel];
      if (!primarySchema) return fields;
      
      const primaryModelName = models?.find(m => m.full_key === primaryModel)?.verbose_name || primaryModel.split('.')[1];
      
      // Add direct fields from primary model
      primarySchema.fields.forEach(f => {
        if (!f.is_relation) {
          fields.push({ 
            ...f, 
            path: f.name, 
            verbose_name: `${f.verbose_name}`,
            source_model: `📌 ${primaryModelName}`
          });
        }
      });

      // Add fields from relations (1 level deep)
      primarySchema.relations.forEach(rel => {
        if (joinedModelKeys.has(rel.related_model) && selectedSchemas[rel.related_model]) {
          const relSchema = selectedSchemas[rel.related_model];
          const relModelName = models?.find(m => m.full_key === rel.related_model)?.verbose_name || rel.related_model.split('.')[1];
          
          // Add fields from this relation
          relSchema.fields.forEach(f => {
            if (!f.is_relation) {
              fields.push({ 
                name: f.name, 
                path: `${rel.name}__${f.name}`, 
                verbose_name: `${f.verbose_name}`,
                type: f.type, 
                is_relation: false, 
                source_model: `🔗 ${relModelName} (via ${rel.name})`
              });
            }
          });
          
          // Add fields from nested relations (2 levels deep)
          relSchema.relations.forEach(nestedRel => {
            if (joinedModelKeys.has(nestedRel.related_model) && selectedSchemas[nestedRel.related_model]) {
              const nestedSchema = selectedSchemas[nestedRel.related_model];
              const nestedModelName = models?.find(m => m.full_key === nestedRel.related_model)?.verbose_name || nestedRel.related_model.split('.')[1];
              
              nestedSchema.fields.forEach(f => {
                if (!f.is_relation) {
                  fields.push({ 
                    name: f.name, 
                    path: `${rel.name}__${nestedRel.name}__${f.name}`, 
                    verbose_name: `${f.verbose_name}`,
                    type: f.type, 
                    is_relation: false, 
                    source_model: `🔗🔗 ${nestedModelName} (via ${rel.name} → ${nestedRel.name})`
                  });
                }
              });
            }
          });
        }
      });
      
      return fields;
    }
    return [];
  };

  const availableFields = useMemo(() => getAvailableFields(), [ormMode, primarySchema, selectedSchemas, selectedModels, models]);
  
  const filteredFields = useMemo(() => {
    if (!fieldSearch) return availableFields;
    const search = fieldSearch.toLowerCase();
    return availableFields.filter(f => f.verbose_name.toLowerCase().includes(search) || f.path.toLowerCase().includes(search));
  }, [availableFields, fieldSearch]);

  const groupedFields = useMemo(() => {
    const groups: Record<string, SchemaField[]> = {};
    filteredFields.forEach(f => { const key = f.source_model || 'Other'; if (!groups[key]) groups[key] = []; groups[key].push(f); });
    return groups;
  }, [filteredFields]);

  const selectDataset = (ds: Dataset) => {
    setSelectedDataset(ds);
    setFormData({ name: ds.name, description: ds.description, query_type: ds.query_type, primary_model: ds.primary_model, sql_query: ds.sql_query, joins: ds.joins || [] });
    setPreviewData([]); setDetectedColumns([]); setSelectedFields([]); setFieldSearch(''); setModelSearch('');
    if (ds.joins && ds.joins.length > 0) { setOrmMode('select'); setSelectedModels([ds.primary_model, ...ds.joins]); }
  };

  const testQuery = async () => {
    if (!selectedDataset) return;
    try {
      const res = await axios.post(`${API_BASE}/datasets/${selectedDataset.dataset_id}/preview/`, { limit: 20 });
      setPreviewData(res.data.data);
      if (res.data.data.length > 0) {
        const cols = Object.keys(res.data.data[0]);
        setPreviewColumns(cols);
        setDetectedColumns(cols.map(name => ({ name, type: typeof res.data.data[0][name] === 'number' ? 'number' : 'string' })));
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert('Query failed: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const autoAddColumns = async () => {
    if (!selectedDataset || detectedColumns.length === 0) return;
    for (let i = 0; i < detectedColumns.length; i++) {
      const col = detectedColumns[i];
      await addColumnMutation.mutateAsync({
        field_name: col.name,
        display_name: col.name.replace(/__/g, ' → ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        data_type: col.type, is_visible: true, is_filterable: true, sort_order: i
      });
    }
    setDetectedColumns([]);
  };

  const addSelectedFieldsAsColumns = async () => {
    if (!selectedDataset || selectedFields.length === 0) return;
    const allFields = ormMode === 'erd' ? [] : availableFields; // For ERD, we use selectedFields directly
    for (let i = 0; i < selectedFields.length; i++) {
      const fieldPath = selectedFields[i];
      const field = allFields.find(f => f.path === fieldPath);
      const displayName = field?.verbose_name || fieldPath.replace(/__/g, ' → ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await addColumnMutation.mutateAsync({
        field_name: fieldPath, display_name: displayName,
        data_type: 'string', is_visible: true, is_filterable: true, sort_order: i
      });
    }
    setSelectedFields([]);
  };

  const toggleFieldSelection = (path: string) => setSelectedFields(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  const toggleModelSelection = (modelKey: string) => { setSelectedModels(prev => prev.includes(modelKey) ? prev.filter(m => m !== modelKey) : [...prev, modelKey]); setSelectedFields([]); };
  const selectAllModels = () => setSelectedModels(filteredModels.map(m => m.full_key));
  const unselectAllModels = () => { setSelectedModels([]); setSelectedFields([]); };
  const selectAllFields = () => setSelectedFields(filteredFields.map(f => f.path));
  const unselectAllFields = () => setSelectedFields([]);

  const newDataset = () => {
    setSelectedDataset(null);
    setFormData({ name: '', description: '', query_type: 'sql', primary_model: '', sql_query: '', joins: [] });
    setPreviewData([]); setDetectedColumns([]); setSelectedFields([]); setSelectedModels([]); setFieldSearch(''); setModelSearch('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dataset Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Create reusable data sources for reports</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reporting/datasets/erd')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2">
            🗂️ Open Full-Page ERD Builder
          </button>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Power User Tool</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Dataset List */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Datasets</h2>
            <button onClick={newDataset} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">+ New</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {datasets?.map(ds => (
              <div key={ds.dataset_id} onClick={() => selectDataset(ds)}
                className={`p-2 rounded cursor-pointer transition text-sm ${selectedDataset?.dataset_id === ds.dataset_id 
                  ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{ds.name}</p>
                <p className="text-xs text-gray-500">{ds.query_type.toUpperCase()} • {ds.column_count || 0} cols</p>
              </div>
            ))}
            {(!datasets || datasets.length === 0) && <p className="text-xs text-gray-400 text-center py-4">No datasets</p>}
          </div>
        </div>

        {/* Main Editor */}
        <div className="col-span-7 bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center gap-4">
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dataset Name *" className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-700 text-sm" />
            <select value={formData.query_type} onChange={e => setFormData({ ...formData, query_type: e.target.value as 'orm' | 'sql' })}
              className="p-2 border rounded-lg bg-white dark:bg-gray-700 text-sm w-48">
              <option value="sql">📝 Raw SQL</option>
              <option value="orm">🔗 ORM Multi-Model</option>
            </select>
          </div>

          {formData.query_type === 'sql' ? (
            <textarea value={formData.sql_query || ''} onChange={e => setFormData({ ...formData, sql_query: e.target.value })}
              placeholder="SELECT t.title, p.name as project_name FROM pm_tasks t LEFT JOIN pm_projects p ON t.project_id = p.project_id"
              rows={10} className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 dark:bg-gray-900" />
          ) : (
            <div className="space-y-4">
              {/* Mode Toggle - Now with 3 options */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                <button onClick={() => { setOrmMode('select'); setSelectedFields([]); }}
                  className={`px-3 py-2 text-sm rounded ${ormMode === 'select' ? 'bg-white dark:bg-gray-600 shadow font-medium' : ''}`}>
                  🎯 Select
                </button>
                <button onClick={() => { setOrmMode('auto'); setSelectedModels([]); setSelectedFields([]); }}
                  className={`px-3 py-2 text-sm rounded ${ormMode === 'auto' ? 'bg-white dark:bg-gray-600 shadow font-medium' : ''}`}>
                  🌐 Auto
                </button>
                <button onClick={() => { setOrmMode('erd'); setSelectedFields([]); }}
                  className={`px-3 py-2 text-sm rounded ${ormMode === 'erd' ? 'bg-white dark:bg-gray-600 shadow font-medium' : ''}`}>
                  🗂️ ERD View
                </button>
              </div>

              {ormMode === 'erd' ? (
                /* ERD Visual Mode */
                <Suspense fallback={<div className="h-80 flex items-center justify-center text-gray-400">Loading ERD View...</div>}>
                  <DatasetERDView selectedFields={selectedFields} onFieldsChange={setSelectedFields} />
                </Suspense>
              ) : (
                /* Select / Auto Mode - Improved layout for 100+ tables */
                <div className="grid grid-cols-2 gap-4">
                  {/* Models Selection - Categorized by App */}
                  <div className="border rounded-lg bg-gray-50 dark:bg-gray-900 flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b bg-white dark:bg-gray-800">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        🗂️ {ormMode === 'select' ? 'Select Tables' : 'Primary Model'}
                        {ormMode === 'select' && selectedModels.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{selectedModels.length} selected</span>
                        )}
                      </p>
                      {ormMode === 'select' && (
                        <div className="flex gap-1">
                          <button onClick={unselectAllModels} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded">Clear All</button>
                        </div>
                      )}
                    </div>
                    
                    {/* Search */}
                    {ormMode === 'select' && (
                      <div className="p-2 border-b bg-white dark:bg-gray-800">
                        <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                          placeholder="🔍 Search tables..." className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-700" />
                      </div>
                    )}
                    
                    {/* Selected Models Summary - Always visible at top */}
                    {ormMode === 'select' && selectedModels.length > 0 && (
                      <div className="p-2 border-b bg-blue-50 dark:bg-blue-900/30">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">📌 Selected Tables (order = join priority)</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedModels.map((key, idx) => {
                            const m = models?.find(mod => mod.full_key === key);
                            return (
                              <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                {idx === 0 && '👑 '}{m?.verbose_name || key.split('.')[1]}
                                <button onClick={() => toggleModelSelection(key)} className="hover:text-red-500">×</button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Categorized Models List */}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
                      {ormMode === 'select' ? (
                        <div className="p-1">
                          {groupedByApp.map(([category, categoryModels]) => {
                            const isCollapsed = collapsedCategories.has(category);
                            const selectedCount = categoryModels.filter(m => selectedModels.includes(m.full_key)).length;
                            
                            return (
                              <div key={category} className="mb-1">
                                {/* Category Header - Clickable to collapse */}
                                <button 
                                  onClick={() => toggleCategory(category)}
                                  className="w-full flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                >
                                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                    <span className="transform transition-transform" style={{ display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                                    {category}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                                    {selectedCount > 0 && <span className="text-blue-600 font-bold">{selectedCount}/</span>}{categoryModels.length}
                                  </span>
                                </button>
                                
                                {/* Category Models - Collapsible */}
                                {!isCollapsed && (
                                  <div className="pl-2 py-1 space-y-0.5">
                                    {categoryModels.map(m => {
                                      const isSelected = selectedModels.includes(m.full_key);
                                      const idx = selectedModels.indexOf(m.full_key);
                                      
                                      return (
                                        <label 
                                          key={m.full_key} 
                                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all border ${
                                            isSelected 
                                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' 
                                              : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                                          }`}
                                        >
                                          <input 
                                            type="checkbox" 
                                            checked={isSelected} 
                                            onChange={() => toggleModelSelection(m.full_key)} 
                                            className="w-4 h-4 accent-blue-600" 
                                          />
                                          <span className={`text-sm flex-1 ${idx === 0 ? 'font-bold text-blue-600' : ''}`}>
                                            {m.verbose_name}
                                          </span>
                                          {idx === 0 && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">PRIMARY</span>}
                                          {idx > 0 && <span className="text-[10px] text-gray-400">#{idx + 1}</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-2">
                          <select value={formData.primary_model || ''} onChange={e => { setFormData({ ...formData, primary_model: e.target.value }); setSelectedFields([]); }}
                            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-sm">
                            <option value="">Select Model...</option>
                            {groupedByApp.map(([category, categoryModels]) => (
                              <optgroup key={category} label={category}>
                                {categoryModels.map(m => <option key={m.full_key} value={m.full_key}>{m.verbose_name}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Available Fields - Improved Layout */}
                  <div className="border rounded-lg bg-gray-50 dark:bg-gray-900 flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b bg-white dark:bg-gray-800">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        📋 Available Fields {availableFields.length > 0 && `(${availableFields.length})`}
                        {selectedFields.length > 0 && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{selectedFields.length} selected</span>}
                      </p>
                      <div className="flex gap-1">
                        <button onClick={selectAllFields} disabled={filteredFields.length === 0} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded disabled:opacity-50">Select All</button>
                        <button onClick={unselectAllFields} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded">Clear</button>
                      </div>
                    </div>
                    <div className="p-2 border-b">
                      <input type="text" value={fieldSearch} onChange={e => setFieldSearch(e.target.value)}
                        placeholder="🔍 Search fields..." className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-700" />
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
                      {Object.keys(groupedFields).length > 0 ? (
                        Object.entries(groupedFields).map(([model, fields]) => (
                          <div key={model} className="mb-4">
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 px-2 py-1 mb-1 bg-gray-100 dark:bg-gray-800 rounded sticky top-0">{model}</p>
                            <div className="space-y-1">
                              {fields.map(field => (
                                <label key={field.path} 
                                  className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-all border ${
                                    selectedFields.includes(field.path) 
                                      ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' 
                                      : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedFields.includes(field.path)} 
                                    onChange={() => toggleFieldSelection(field.path)} 
                                    className="w-4 h-4 mt-0.5 accent-purple-600" />
                                  <div className="flex-1 min-w-0">
                                    <span className={`block text-sm font-medium ${selectedFields.includes(field.path) ? 'text-purple-700 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {field.verbose_name}
                                    </span>
                                    <span className="block text-xs text-gray-500 font-mono truncate" title={field.path}>
                                      {field.path}
                                    </span>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded uppercase font-medium">
                                    {field.type.replace('Field', '')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : <p className="text-sm text-gray-400 py-8 text-center">{ormMode === 'select' ? '← Select models on the left first' : 'Select a primary model first'}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Add columns button for all ORM modes */}
              {selectedFields.length > 0 && selectedDataset && (
                <button onClick={addSelectedFieldsAsColumns} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  ➕ Add {selectedFields.length} Fields as Columns
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">💾 Save</button>
            {selectedDataset && (
              <>
                {selectedDataset.query_type === 'orm' && (
                  <button onClick={() => navigate(`/reporting/datasets/erd?dataset=${selectedDataset.dataset_id}`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                    🎨 Edit in ERD
                  </button>
                )}
                <button onClick={testQuery} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">▶ Test Query</button>
                <button onClick={() => { if(confirm('Delete?')) deleteMutation.mutate(selectedDataset.dataset_id); }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">🗑️</button>
              </>
            )}
          </div>
        </div>

        {/* Columns Panel */}
        <div className="col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Dataset Columns</h2>
          {selectedDataset ? (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {datasetColumns?.map(col => (
                  <div key={col.column_id} className="flex items-center justify-between text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="truncate flex-1 mr-2">
                      <span className="font-medium">{col.display_name}</span>
                      <p className="text-xs text-gray-500 truncate">{col.field_name}</p>
                    </div>
                    <button onClick={() => col.column_id && deleteColumnMutation.mutate(col.column_id)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                ))}
                {(!datasetColumns || datasetColumns.length === 0) && <p className="text-sm text-gray-400 text-center py-4">No columns yet</p>}
              </div>
              {detectedColumns.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <button onClick={autoAddColumns} className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm">✨ Auto-Add {detectedColumns.length} Columns</button>
                </div>
              )}
            </>
          ) : <p className="text-sm text-gray-400 text-center py-8">Select a dataset first</p>}
        </div>
      </div>

      {/* Preview */}
      {previewData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Query Preview ({previewData.length} rows)</h2>
          <div className="overflow-x-auto border rounded max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>{previewColumns.map(col => <th key={col} className="p-2 text-left font-medium whitespace-nowrap">{col}</th>)}</tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {previewColumns.map(col => <td key={col} className="p-2 border-t whitespace-nowrap">{String(row[col] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetBuilder;

