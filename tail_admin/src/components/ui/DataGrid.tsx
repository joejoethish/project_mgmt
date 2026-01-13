import { useMemo, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Download, LayoutList, Search, AlignJustify } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './ag-theme-custom.css';

// Register all community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
    rowData: any[];
    columnDefs?: ColDef[];
    columns?: string[]; 
    height?: string | number;
    pagination?: boolean;
    loading?: boolean;
    className?: string; // Default will be customized
    title?: string;
    description?: string;
    enableSearch?: boolean;
    enableExport?: boolean;
    enableDensity?: boolean;
    enableColumnVisibility?: boolean;
    enableSelection?: boolean;
}

export const DataGrid = ({ 
    rowData, 
    columnDefs, 
    columns, 
    height = '600px', 
    pagination = true, 
    loading = false,
    className = 'ag-theme-alpine ag-theme-tailadmin',
    title,
    description,
    enableSearch = true,
    enableExport = true,
    enableDensity = true,
    enableColumnVisibility = true,
    enableSelection = true
}: DataGridProps) => {
    
    const gridRef = useRef<AgGridReact>(null);
    const [searchValue, setSearchValue] = useState('');
    const [gridApi, setGridApi] = useState<any>(null);
    const [gridColumnApi, setGridColumnApi] = useState<any>(null);
    
    // Density State
    const [rowHeight, setRowHeight] = useState<number>(50); // Standard
    const [densityOpen, setDensityOpen] = useState(false);

    // Column Visibility State
    const [colsOpen, setColsOpen] = useState(false);
    const [allColumns, setAllColumns] = useState<any[]>([]);

    const finalColDefs = useMemo(() => {
        let defs: ColDef[] = [];
        if (columnDefs) {
             defs = [...columnDefs];
        } else if (columns) {
            defs = columns.map(col => ({
                field: col,
                headerName: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
                filter: true,
                sortable: true,
                resizable: true,
                flex: 1, 
                minWidth: 150
            }));
        }

        if (enableSelection && defs.length > 0) {
            // Add checkbox selection to the first column
            defs[0] = {
                ...defs[0],
                checkboxSelection: true,
                headerCheckboxSelection: true
            };
        }
        return defs;
    }, [columnDefs, columns, enableSelection]);

    const onGridReady = (params: any) => {
        setGridApi(params.api);
        setGridColumnApi(params.columnApi);
        if (loading) params.api.showLoadingOverlay();
        
        // Initialize columns for visibility toggle
        if (params.api) { // api.getColumns() in v31+? or columnApi.getAllGridColumns()
             // In v31+, column api is merged into grid api mostly, but check docs.
             // Lets try to get columns safely.
             const cols = params.api.getColumns?.() || params.columnApi?.getAllGridColumns?.();
             if (cols) {
                 setAllColumns(cols.map((c: any) => ({
                     colId: c.getColId(),
                     headerName: c.getColDef().headerName || c.getColId(),
                     visible: c.isVisible()
                 })));
             }
        }
    };

    // Update loading overlay
    useEffect(() => {
        if (!gridApi) return;
        if (loading) {
            gridApi.showLoadingOverlay();
        } else {
            gridApi.hideOverlay();
        }
    }, [loading, gridApi]);

    // Update Row Height when density changes
    // But rowHeight prop change might require API refresh? 
    // AgGridReact prop update usually handles it.

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchValue(val);
        if (gridApi) {
             // Safe check for setGridOption (v31+) or setQuickFilter (legacy)
             if (gridApi.setGridOption) {
                 gridApi.setGridOption('quickFilterText', val);
             } else if (gridApi.setQuickFilter) {
                 gridApi.setQuickFilter(val);
             }
        }
    };

    const handleExport = () => {
        if (gridApi) {
            gridApi.exportDataAsCsv();
        }
    };

    const changeDensity = (height: number) => {
        setRowHeight(height);
        setDensityOpen(false);
        // api.resetRowHeights() might be needed?
        if (gridApi) {
             gridApi.resetRowHeights();
        }
    };

    const toggleColumn = (colId: string) => {
        if (gridApi) {
            const col = allColumns.find(c => c.colId === colId);
            if (col) {
                gridApi.setColumnsVisible([colId], !col.visible);
                // Update local state
                setAllColumns(prev => prev.map(c => 
                    c.colId === colId ? { ...c, visible: !c.visible } : c
                ));
            }
        }
    };

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            {/* Header / Toolbar */}
            {(title || enableSearch || enableExport || enableDensity || enableColumnVisibility) && (
                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        {title && <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">{title}</h3>}
                        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
                    </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    {enableSearch && (
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
                                value={searchValue}
                                onChange={handleSearch}
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    )}

                    {/* Columns Dropdown */}
                    {enableColumnVisibility && (
                        <div className="relative">
                            <button 
                                onClick={() => setColsOpen(!colsOpen)}
                                className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                title="Columns"
                            >
                                <LayoutList className="h-5 w-5" />
                            </button>
                            {colsOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-auto">
                                    <h4 className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase">Columns</h4>
                                    {allColumns.map(col => (
                                        <label key={col.colId} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-700 dark:text-gray-200">
                                            <input 
                                                type="checkbox" 
                                                checked={col.visible}
                                                onChange={() => toggleColumn(col.colId)}
                                                className="rounded border-gray-300"
                                            />
                                            {col.headerName}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Density Dropdown */}
                    {enableDensity && (
                        <div className="relative">
                            <button 
                                onClick={() => setDensityOpen(!densityOpen)}
                                className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                title="Density"
                            >
                                <AlignJustify className="h-5 w-5" />
                            </button>
                            {densityOpen && (
                                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                    <button onClick={() => changeDensity(35)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${rowHeight === 35 ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>Compact</button>
                                    <button onClick={() => changeDensity(50)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${rowHeight === 50 ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>Standard</button>
                                    <button onClick={() => changeDensity(65)} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${rowHeight === 65 ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>Comfortable</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Export */}
                    {enableExport && (
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export</span>
                        </button>
                    )}
                </div>
            </div>
            )}

            {/* AG Grid Container */}
            
            <div className={className} style={{ height: height, width: '100%' }}>
                <AgGridReact
                    ref={gridRef}
                    rowData={rowData}
                    columnDefs={finalColDefs}
                    pagination={pagination}
                    paginationPageSize={20}
                    rowHeight={rowHeight} // Dynamic row height
                    rowSelection={enableSelection ? 'multiple' : undefined}
                    onGridReady={onGridReady}
                    animateRows={true}
                    defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true
                    }}
                />
            </div>
        </div>
    );
};
