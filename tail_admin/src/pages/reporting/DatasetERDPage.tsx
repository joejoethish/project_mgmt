import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = 'http://192.168.1.26:8000/api/reporting';

interface SchemaField { name: string; verbose_name: string; type: string; }
interface Relation { name: string; verbose_name: string; related_model: string; }
interface ModelSchema { model: string; fields: SchemaField[]; relations: Relation[]; }
interface ModelInfo { full_key: string; verbose_name: string; }

interface TableNodeData {
  modelKey: string;
  label: string;
  fields: SchemaField[];
  relations: Relation[];
  selectedFields: string[];
  onFieldToggle: (modelKey: string, fieldPath: string) => void;
  onSelectAll: (modelKey: string, fields: SchemaField[], isPrimary: boolean) => void;
  isPrimary: boolean;
  pathPrefix: string;
  [key: string]: unknown;
}

// Helper to calculate ORM paths from primary model
const calculateModelPaths = (edges: Edge[], primaryModel: string) => {
  const paths: Record<string, string> = { [primaryModel]: '' };
  const queue: { model: string, path: string }[] = [{ model: primaryModel, path: '' }];
  const visited = new Set([primaryModel]);
  
  // Build adjacency list
  const adj: Record<string, { target: string, relName: string }[]> = {};
  
  edges.forEach(edge => {
    if (!edge.id) return;
    const prefix = `${edge.source}-${edge.target}-`;
    if (edge.id.startsWith(prefix)) {
        const relName = edge.id.substring(prefix.length);
        if (!adj[edge.source]) adj[edge.source] = [];
        adj[edge.source].push({ target: edge.target, relName });
    }
  });

  while (queue.length > 0) {
    const { model, path } = queue.shift()!;
    if (adj[model]) {
        for (const edge of adj[model]) {
            if (!visited.has(edge.target)) {
                visited.add(edge.target);
                const newPath = path ? `${path}__${edge.relName}` : edge.relName;
                paths[edge.target] = newPath;
                queue.push({ model: edge.target, path: newPath });
            }
        }
    }
  }
  return paths;
};

// Helper to get fallback prefix from modelKey (e.g., "pm.Members" -> "members")
const getModelNameFromKey = (modelKey: string) => {
  const parts = modelKey.split('.');
  return parts.length > 1 ? parts[1].toLowerCase() : modelKey.toLowerCase();
};

// Custom Table Node with internal scroll and resizable height
const TableNode = ({ data }: { data: TableNodeData }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nodeSize, setNodeSize] = useState<'compact' | 'normal' | 'expanded'>('normal');
  
  // For secondary entities, use pathPrefix if available, otherwise fallback to model name
  const effectivePrefix = data.isPrimary ? '' : (data.pathPrefix || getModelNameFromKey(data.modelKey));
  
  const selectedCount = data.fields?.filter(f => {
    const fieldPath = data.isPrimary ? f.name : `${effectivePrefix}__${f.name}`;
    return data.selectedFields.includes(fieldPath);
  }).length || 0;

  // Size configurations
  const sizeConfig = {
    compact: { maxHeight: '80px', label: 'S' },
    normal: { maxHeight: '180px', label: 'M' },
    expanded: { maxHeight: '400px', label: 'L' },
  };

  // Attach native wheel event listener to intercept before ReactFlow
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const canScrollUp = scrollTop > 0;
      const canScrollDown = scrollTop + clientHeight < scrollHeight;
      
      if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
        e.stopPropagation();
      }
    };
    
    scrollEl.addEventListener('wheel', handleWheel, { passive: false, capture: false });
    
    return () => {
      scrollEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Cycle through sizes
  const cycleSize = () => {
    setNodeSize(prev => prev === 'compact' ? 'normal' : prev === 'normal' ? 'expanded' : 'compact');
  };

  return (
    <div className={`rounded-lg shadow-xl border-2 ${data.isPrimary ? 'border-blue-500' : 'border-gray-400'}`}
      style={{ backgroundColor: data.isPrimary ? '#eff6ff' : '#ffffff', width: nodeSize === 'expanded' ? '360px' : '280px' }}>
      {/* Header */}
      <div className={`px-3 py-2 rounded-t-lg flex items-center justify-between ${data.isPrimary ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-bold text-sm">{data.label}</span>
          {data.isPrimary && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">PRIMARY</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{selectedCount}/{data.fields?.length || 0}</span>
          <button onClick={cycleSize} className="text-xs bg-white/30 hover:bg-white/40 px-1.5 py-0.5 rounded" title="Change size (S/M/L)">
            {sizeConfig[nodeSize].label}
          </button>
        </div>
      </div>
      
      {/* Select All Row */}
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <button onClick={() => {
            // Check if we need to pass extra args. data.onSelectAll is typed strict?
            // TypeScript allows extra args if not strictly defined, or we redefine.
            // Let's cast or update interface.
             (data.onSelectAll as any)(data.modelKey, data.fields, data.isPrimary, data.pathPrefix);
        }}
          className="text-xs text-blue-600 hover:underline font-medium">☑️ Select All</button>
        <span className="text-[10px] text-gray-400">{data.fields?.length} fields</span>
      </div>
      
      {/* Fields with internal scroll - Variable height based on size */}
      <div ref={scrollRef} className="overflow-y-auto nodrag nowheel" style={{ maxHeight: sizeConfig[nodeSize].maxHeight }}>
        {data.fields?.map((field, idx) => {
          // Use effectivePrefix for consistent field path generation
          const fieldPath = data.isPrimary ? field.name : `${effectivePrefix}__${field.name}`;
          const isSelected = data.selectedFields.includes(fieldPath);
          
          return (
            <div key={idx} className="relative flex items-center gap-2 text-xs py-1.5 px-3 hover:bg-blue-50 border-b border-gray-100"
              style={{ backgroundColor: isSelected ? '#dbeafe' : 'transparent' }}>
              <Handle type="target" position={Position.Left} id={`${field.name}-target`} className="!w-2 !h-2" style={{ left: -4, background: '#6b7280' }} />
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => data.onFieldToggle(data.modelKey, fieldPath)}
                className="w-3.5 h-3.5 accent-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`flex-1 truncate ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`} title={field.verbose_name}>
                {field.verbose_name}
              </span>
              <span className="text-[10px] text-gray-400">{field.type}</span>
              <Handle type="source" position={Position.Right} id={`${field.name}-source`} className="!w-2 !h-2" style={{ right: -4, background: '#3b82f6' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const nodeTypes = { tableNode: TableNode };

// Friendly module names
const moduleNames: Record<string, string> = {
  pm: '📋 Project Management',
  hr: '👥 Human Resources',
  masters: '🗄️ Masters',
  reporting: '📊 Reporting',
  tags: '🏷️ Tags',
  auth: '🔒 Authentication',
  contenttypes: '⚙️ System',
  sessions: '⚙️ System',
  admin: '⚙️ System',
};

export default function DatasetERDPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset');
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [schemas, setSchemas] = useState<Record<string, ModelSchema>>({});
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load models on mount
  useEffect(() => {
    axios.get(`${API_BASE}/schema/`).then(res => setModels(res.data));
  }, []);



  // Handle field toggle
  const handleFieldToggle = useCallback((modelKey: string, fieldPath: string) => {
    setSelectedFields(prev => prev.includes(fieldPath) ? prev.filter(f => f !== fieldPath) : [...prev, fieldPath]);
  }, []);

  // Handle select all for a model
  // Note: We now use the path calculation from nodes state to know the prefix
  // But handleSelectAll needs to know the prefix. 
  // We can pass it from the Node component which has it in 'data'.
  // We need to update the signature of handleSelectAll in the interface first? 
  // Actually, we can just update the function here and pass string from Node.
  const handleSelectAll = useCallback((modelKey: string, fields: SchemaField[], isPrimary: boolean, pathPrefix?: string) => {
    // For secondary entities, use pathPrefix if available, otherwise fallback to model name
    const effectivePrefix = isPrimary ? '' : (pathPrefix || getModelNameFromKey(modelKey));
    
    // Generate fields using the effective prefix - match TableNode's logic exactly
    const modelFields = fields.map(f => {
      if (isPrimary) return f.name;
      return `${effectivePrefix}__${f.name}`;
    });
    setSelectedFields(prev => {
      const otherFields = prev.filter(f => !modelFields.includes(f));
      const allSelected = modelFields.every(f => prev.includes(f));
      return allSelected ? otherFields : [...otherFields, ...modelFields];
    });
  }, []);

  // Load existing dataset if editing (Moved here to access handlers)
  useEffect(() => {
    if (datasetId && models.length > 0) {
      const loadDataset = async () => {
        try {
          const res = await axios.get(`${API_BASE}/datasets/${datasetId}/`);
          const dataset = res.data;
          
          setDatasetName(dataset.name);
          
          // Load columns
          const colRes = await axios.get(`${API_BASE}/datasets/${datasetId}/columns/`);
          setSelectedFields(colRes.data.map((c: { field_name: string }) => c.field_name));
          
          // Load tables onto canvas - primary_model first, then joins
          const tablesToLoad: string[] = [];
          if (dataset.primary_model) tablesToLoad.push(dataset.primary_model);
          if (dataset.joins && Array.isArray(dataset.joins)) {
            tablesToLoad.push(...dataset.joins);
          }
          
          // Add each table to canvas with position index - check if already loaded
          
          // We need to fetch schemas for new tables
          for (let i = 0; i < tablesToLoad.length; i++) {
            const modelKey = tablesToLoad[i];
            
            // Skip if already has node (unless we want to refresh?)
            // Actually we are initiating everything, so we assume clean slate or append
            
            try {
              const schemaRes = await axios.get(`${API_BASE}/schema/?model=${modelKey}`);
              const schema: ModelSchema = schemaRes.data;
              
              setSchemas(prev => ({ ...prev, [modelKey]: schema }));
              setLoadedModels(prev => prev.includes(modelKey) ? prev : [...prev, modelKey]);
              
              const modelName = models.find(m => m.full_key === modelKey)?.verbose_name || modelKey;
              const row = Math.floor(i / 3);
              const col = i % 3;
              
              // Only add node if it doesn't exist
              setNodes(prev => {
                if (prev.some(n => n.id === modelKey)) return prev;
                return [...prev, {
                  id: modelKey,
                  type: 'tableNode',
                  position: { x: col * 320 + 80, y: row * 320 + 80 },
                  data: { modelKey, label: modelName, fields: schema.fields, relations: schema.relations, selectedFields: [], onFieldToggle: handleFieldToggle, onSelectAll: handleSelectAll, isPrimary: i === 0 },
                }];
              });
            } catch (err) {
              console.error(`Failed to load model ${modelKey}:`, err);
            }
          }
          
          // Generate edges for all loaded tables
          // We need to wait for state updates or pass the new lists directly
          // Since we updated state in loop, let's use a timeout or better, generate edges based on tablesToLoad
          
          const newEdges: Edge[] = [];
          
          // We need schemas for ALL loaded tables to generate edges
          // Since setSchemas is async, we can't trust 'schemas' state immediately if we just set it
          // But we have the new schemas in the loop
          
          // Actually, let's just trigger edge generation in a separate effect or use a helper that reads from current schemas
          // For now, let's construct edges from the loop data if possible, or trigger a refresh
        } catch (err) {
          console.error('Failed to load dataset:', err);
          toast.error('Failed to load dataset');
        }
      };
      
      loadDataset();
    }
  }, [datasetId, models, handleFieldToggle, handleSelectAll, setNodes]);

  // Effect to regenerate edges whenever loadedModels or schemas change
  useEffect(() => {
    if (loadedModels.length === 0) return;
    
    setEdges(prev => {
      const newEdges: Edge[] = [];
      const existingIds = new Set(prev.map(e => e.id));
      const processedPairs = new Set<string>(); // Track unique pairs
      
      loadedModels.forEach(modelKey => {
        const schema = schemas[modelKey];
        if (!schema) return;
        
        schema.relations.forEach(rel => {
          if (loadedModels.includes(rel.related_model)) {
            // Create canonical pair key (sorted) to avoid duplicates
            const pairKey = [modelKey, rel.related_model].sort().join('|');
            
            if (!processedPairs.has(pairKey)) {
              const id = `${pairKey}-${rel.name}`;
              if (!existingIds.has(id)) {
                // The FK field in the source table (e.g., "project_id" in Tasks)
                const fkFieldName = rel.name;
                
                // Find the PK/ID field in the target table
                const targetSchema = schemas[rel.related_model];
                const pkField = targetSchema?.fields.find(f => 
                  f.name.toLowerCase().includes('id') && f.type === 'UUIDField'
                ) || targetSchema?.fields[0];
                const pkFieldName = pkField?.name || 'id';
                
                newEdges.push({
                  id,
                  source: modelKey, 
                  target: rel.related_model, 
                  sourceHandle: `${fkFieldName}-source`,
                  targetHandle: `${pkFieldName}-target`,
                  type: 'smoothstep', 
                  animated: true, 
                  label: rel.verbose_name,
                  style: { stroke: '#3b82f6', strokeWidth: 2 },
                  labelStyle: { fontSize: 10, fill: '#6b7280' },
                  labelBgStyle: { fill: 'white', fillOpacity: 0.8 }
                });
                existingIds.add(id);
              }
              processedPairs.add(pairKey);
            }
          }
        });
      });
      
      return [...prev, ...newEdges];
    });
  }, [loadedModels, schemas, setEdges]);

  // Add model to canvas with explicit position index
  const addModelToCanvas = async (modelKey: string, positionIndex?: number) => {
    if (loadedModels.includes(modelKey)) return;
    
    try {
      const res = await axios.get(`${API_BASE}/schema/?model=${modelKey}`);
      const schema: ModelSchema = res.data;
      
      setSchemas(prev => ({ ...prev, [modelKey]: schema }));
      setLoadedModels(prev => [...prev, modelKey]);
      
      const isPrimary = loadedModels.length === 0 && positionIndex === undefined || positionIndex === 0;
      const modelName = models.find(m => m.full_key === modelKey)?.verbose_name || modelKey;
      
      // Use positionIndex if provided, otherwise use current count
      const idx = positionIndex ?? loadedModels.length;
      const row = Math.floor(idx / 3); // 3 columns
      const col = idx % 3;
      
      const newNode: Node = {
        id: modelKey,
        type: 'tableNode',
        position: { x: col * 320 + 80, y: row * 320 + 80 },
        data: { modelKey, label: modelName, fields: schema.fields, relations: schema.relations, selectedFields, onFieldToggle: handleFieldToggle, onSelectAll: handleSelectAll, isPrimary },
      };
      
      setNodes(prev => [...prev, newNode]);
      
      // Edges will be handled by the new useEffect
      
      toast.success(`Added ${modelName}`);
    } catch {
      toast.error('Failed to load model');
    }
  };

  // Calculate ORM paths whenever edges or loadedModels change
  const modelPaths = useMemo(() => {
    if (loadedModels.length === 0) return {};
    return calculateModelPaths(edges, loadedModels[0]);
  }, [edges, loadedModels]);

  // Update nodes with new paths and selectedFields
  useEffect(() => {
    setNodes(nds => nds.map(node => ({ 
        ...node, 
        data: { 
            ...node.data, 
            isPrimary: loadedModels.indexOf(node.id) === 0, // Recompute to ensure correctness
            pathPrefix: modelPaths[node.id] || '',
            selectedFields, 
            onFieldToggle: handleFieldToggle, 
            onSelectAll: handleSelectAll 
        } 
    })));
  }, [selectedFields, handleFieldToggle, handleSelectAll, setNodes, modelPaths, loadedModels]);

  // Remove model
  const removeModelFromCanvas = (modelKey: string) => {
    setNodes(prev => prev.filter(n => n.id !== modelKey));
    setEdges(prev => prev.filter(e => e.source !== modelKey && e.target !== modelKey));
    setLoadedModels(prev => prev.filter(m => m !== modelKey));
    // Also remove selected fields from this model
    // Also remove selected fields from this model
    const prefix = modelPaths[modelKey];
    setSelectedFields(prev => prev.filter(f => {
        // If primary, prefix is empty, so we filter by exact match with schema fields
        if (loadedModels[0] === modelKey) return !schemas[modelKey]?.fields?.some(sf => sf.name === f);
        // If secondary, filter by prefix
        if (prefix) return !f.startsWith(`${prefix}__`);
        // Fallback for safety (try to remove by old logic too just in case)
         const legacyPrefix = modelKey.split('.')[1]?.toLowerCase();
         if (f.startsWith(legacyPrefix + '__')) return false;
         
        return true;
    }));
    toast.success('Removed from canvas');
  };

  // Select all / clear
  const selectAllFields = () => {
    const allFields: string[] = [];
    loadedModels.forEach((modelKey, idx) => {
      const schema = schemas[modelKey];
      if (schema) {
        const isPrimary = idx === 0;
        schema.fields.forEach(field => {
          const prefix = modelPaths[modelKey];
          // Use prefix if not primary (and prefix exists)
          const fieldPath = isPrimary ? field.name : (prefix ? `${prefix}__${field.name}` : `${field.name}`);
          allFields.push(fieldPath);
        });
      }
    });
    setSelectedFields(allFields);
  };

  // Remove a single selected field
  const removeSelectedField = (fieldPath: string) => {
    setSelectedFields(prev => prev.filter(f => f !== fieldPath));
  };

  // Save dataset
  const saveDataset = async () => {
    if (!datasetName.trim()) { toast.error('Enter a dataset name'); return; }
    if (loadedModels.length === 0) { toast.error('Add at least one table'); return; }
    if (selectedFields.length === 0) { toast.error('Select at least one field'); return; }
    
    setIsSaving(true);
    try {
      const payload = { name: datasetName, query_type: 'orm', primary_model: loadedModels[0], joins: loadedModels.slice(1) };
      
      let dsId = datasetId;
      if (datasetId) {
        await axios.put(`${API_BASE}/datasets/${datasetId}/`, payload);
      } else {
        const res = await axios.post(`${API_BASE}/datasets/`, payload);
        dsId = res.data.dataset_id;
      }
      
      // Add columns
      // Clear existing columns first to prevent duplicates
      if (datasetId) {
          await axios.post(`${API_BASE}/datasets/${dsId}/clear_columns/`);
      }
      
      for (let i = 0; i < selectedFields.length; i++) {
        const fieldPath = selectedFields[i];
        await axios.post(`${API_BASE}/datasets/${dsId}/add_column/`, {
          field_name: fieldPath,
          display_name: fieldPath.replace(/__/g, ' → ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          data_type: 'string', is_visible: true, is_filterable: true, sort_order: i
        });
      }
      
      toast.success('Dataset saved!');
      setTimeout(() => navigate('/reporting/datasets'), 500);
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Table search and pending selection
  const [tableSearch, setTableSearch] = useState('');
  const [pendingTables, setPendingTables] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);



  // Group and sort tables by app
  const groupedModels = useMemo(() => {
    const filtered = tableSearch 
      ? models.filter(m => m.verbose_name.toLowerCase().includes(tableSearch.toLowerCase()))
      : models;
    
    const groups: Record<string, ModelInfo[]> = {};
    filtered.forEach(m => {
      const appLabel = m.full_key.split('.')[0];
      const groupName = moduleNames[appLabel] || `📁 ${appLabel.charAt(0).toUpperCase() + appLabel.slice(1)}`;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(m);
    });
    
    // Sort groups and models within groups
    const sortedGroups: { name: string; models: ModelInfo[] }[] = [];
    Object.keys(groups).sort().forEach(groupName => {
      sortedGroups.push({ name: groupName, models: groups[groupName].sort((a, b) => a.verbose_name.localeCompare(b.verbose_name)) });
    });
    
    return sortedGroups;
  }, [models, tableSearch]);

  // Toggle group collapse
  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]);
  };

  // Add pending tables to canvas and auto-hide sidebar
  const addPendingToCanvas = async () => {
    const startIndex = loadedModels.length; // Get current count before adding
    for (let i = 0; i < pendingTables.length; i++) {
      await addModelToCanvas(pendingTables[i], startIndex + i);
    }
    setPendingTables([]);
    setSidebarVisible(false); // Auto-hide after adding
  };

  // Toggle pending table
  const togglePendingTable = (modelKey: string) => {
    if (loadedModels.includes(modelKey)) return;
    setPendingTables(prev => prev.includes(modelKey) ? prev.filter(m => m !== modelKey) : [...prev, modelKey]);
  };

  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 relative" style={{ height: 'calc(100vh - 80px)' }}>
      <Toaster position="top-center" />
      
      {/* Toggle Button - Fixed position, always visible */}
      <button onClick={() => setSidebarVisible(!sidebarVisible)}
        className="absolute top-1/2 -translate-y-1/2 z-50 p-2 bg-blue-600 text-white rounded-r-lg shadow-lg hover:bg-blue-700 transition-all"
        style={{ left: sidebarVisible ? '256px' : '0px' }}
        title={sidebarVisible ? 'Hide tables' : 'Show tables'}>
        {sidebarVisible ? '◀' : '▶'}
      </button>

      {/* Left Sidebar - Table Selection (Collapsible) */}
      <div className={`${sidebarVisible ? 'w-64' : 'w-0'} bg-white dark:bg-gray-800 border-r shadow-lg flex flex-col transition-all duration-300 overflow-hidden shrink-0`}
           style={{ height: 'calc(100vh - 80px)' }}>
        <div className="p-3 border-b bg-gray-50 dark:bg-gray-700 shrink-0">
          <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm whitespace-nowrap">
            📊 Available Tables
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{models.length}</span>
          </h2>
        </div>
        
        {/* Search */}
        <div className="p-2 border-b shrink-0">
          <input type="text" value={tableSearch} onChange={e => setTableSearch(e.target.value)}
            placeholder="🔍 Search tables..." className="w-full p-2 text-sm border rounded bg-white dark:bg-gray-700" />
        </div>
        
        {/* Table List with Groups - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {groupedModels.map(group => {
            const isCollapsed = collapsedGroups.includes(group.name);
            const groupHasSelected = group.models.some(m => loadedModels.includes(m.full_key) || pendingTables.includes(m.full_key));
            
            return (
              <div key={group.name} className="mb-2">
                {/* Group Header */}
                <button onClick={() => toggleGroup(group.name)}
                  className={`w-full flex items-center gap-2 p-2 rounded text-sm font-semibold whitespace-nowrap ${groupHasSelected ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'} hover:bg-gray-200 dark:hover:bg-gray-600`}>
                  <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                  <span className="flex-1 text-left truncate">{group.name}</span>
                  <span className="text-xs bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded">{group.models.length}</span>
                </button>
                
                {/* Group Models */}
                {!isCollapsed && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    {group.models.map(m => {
                      const isOnCanvas = loadedModels.includes(m.full_key);
                      const isPending = pendingTables.includes(m.full_key);
                      const isFirst = loadedModels.indexOf(m.full_key) === 0;
                      
                      return (
                        <label key={m.full_key} 
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition whitespace-nowrap
                            ${isOnCanvas ? 'bg-green-50 dark:bg-green-900/30 border-l-2 border-green-500' : isPending ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-2 border-transparent'}`}>
                          <input type="checkbox" 
                            checked={isOnCanvas || isPending}
                            onChange={() => isOnCanvas ? removeModelFromCanvas(m.full_key) : togglePendingTable(m.full_key)}
                            className="w-3.5 h-3.5 accent-blue-600" />
                          <span className={`flex-1 truncate ${isOnCanvas ? 'font-semibold text-green-700' : isPending ? 'font-medium text-blue-700' : ''}`}>
                            {m.verbose_name}
                          </span>
                          {isFirst && <span className="text-[9px] bg-blue-600 text-white px-1 rounded">1st</span>}
                          {isOnCanvas && !isFirst && <span className="text-[9px] bg-green-600 text-white px-1 rounded">✓</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Add Pending Button - Fixed at bottom */}
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-700 shrink-0">
          {pendingTables.length > 0 ? (
            <button onClick={addPendingToCanvas}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
              ➕ Add {pendingTables.length} Table{pendingTables.length > 1 ? 's' : ''} to Canvas
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center py-1">Select tables to add</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reporting/datasets')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600">
              ← Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">🗂️ ERD Dataset Builder</h1>
              <p className="text-xs text-gray-500">Select tables from left • Check fields • Save dataset</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input type="text" value={datasetName} onChange={e => setDatasetName(e.target.value)}
              placeholder="Dataset Name *" className="px-3 py-2 border rounded-lg w-56 bg-white dark:bg-gray-700 text-sm" />
            <button onClick={saveDataset} disabled={isSaving}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
              {isSaving ? '⏳ Saving...' : '💾 Save & Return'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b px-6 py-2 flex items-center gap-4">
          <button onClick={selectAllFields} disabled={nodes.length === 0}
            className="px-3 py-1.5 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50">
            ☑️ Select All Fields
          </button>
          <button onClick={() => setSelectedFields([])} className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
            Clear Selection
          </button>
          
          {loadedModels.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-500">On canvas:</span>
              {loadedModels.map((m, idx) => (
                <span key={m} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {models.find(model => model.full_key === m)?.verbose_name}
                  <button onClick={() => removeModelFromCanvas(m)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Canvas - Full Height with zoom/pan */}
        <div className="flex-1">
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-4">🗂️</p>
                <p className="text-lg font-medium">Select tables from the left sidebar</p>
                <p className="text-sm mt-2">Check tables → Add to canvas → Select fields</p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2}
              zoomOnScroll={true}
              panOnScroll={false}
              panOnDrag={true}
              selectionOnDrag={false}
            >
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap nodeStrokeWidth={3} zoomable pannable position="bottom-right" style={{ width: 150, height: 100 }} />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Right Sidebar - Selected Columns */}
      <div className="w-64 bg-white dark:bg-gray-800 border-l shadow-lg flex flex-col">
        <div className="p-3 border-b bg-gray-50 dark:bg-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
            📋 Selected Columns
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{selectedFields.length}</span>
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {selectedFields.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-xs">No fields selected</p>
              <p className="text-xs mt-1">Check fields in tables</p>
            </div>
          ) : (
            selectedFields.map((fieldPath, idx) => (
              <div key={fieldPath} className="flex items-center gap-1 p-1.5 bg-gray-50 dark:bg-gray-700 rounded border text-xs group">
                <span className="text-gray-400 w-4">{idx + 1}</span>
                <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-200" title={fieldPath}>
                  {fieldPath.includes('__') ? fieldPath.replace(/__/g, ' → ') : fieldPath}
                </span>
                <button onClick={() => removeSelectedField(fieldPath)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">✕</button>
              </div>
            ))
          )}
        </div>
        
        {selectedFields.length > 0 && (
          <div className="p-3 border-t bg-gray-50 dark:bg-gray-700">
            <button onClick={saveDataset} disabled={isSaving || !datasetName.trim()}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
              💾 Save Dataset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

