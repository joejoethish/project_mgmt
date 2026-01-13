import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { 
  Search, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Inbox,
  Columns3,
  ChevronDown as ChevronDownIcon,
  Check,
  X,
  GripVertical,
  FileSpreadsheet,
  FileText,
  Save,
  RotateCcw,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface AdvancedTableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  className?: string;
  width?: number | string;
  minWidth?: number;
  visible?: boolean;
  editable?: boolean;
  editRender?: (value: unknown, row: T, onChange: (newValue: unknown) => void) => React.ReactNode;
  pinned?: "left" | "right"; // For pinned columns
  aggregate?: "sum" | "avg" | "count" | "min" | "max"; // For aggregation
  groupable?: boolean; // Can be used for grouping
}

export interface RowAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
  variant?: "default" | "danger";
}

export interface BulkAction<T = any> {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRows: T[]) => void;
  variant?: "default" | "danger";
}

export interface ExpandedRowContent<T = any> {
  render: (row: T) => React.ReactNode;
}

export interface ServerPagination {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

// Table view state for saving/restoring
export interface TableViewState {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  columnWidths: Record<string, number>;
  sortKey: string | null;
  sortDirection: "asc" | "desc";
}

export interface AdvancedTableProps<T = any> {
  data: T[];
  columns: AdvancedTableColumn<T>[];
  title?: string;
  description?: string;
  
  // Feature toggles
  enableSearch?: boolean;
  enablePagination?: boolean;
  enableExport?: boolean;
  enableSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableStickyHeader?: boolean;
  enableRowExpansion?: boolean;
  enableColumnResize?: boolean;
  enableColumnReorder?: boolean;
  enableInlineEdit?: boolean;
  enableKeyboardNavigation?: boolean;
  enableSavedViews?: boolean;
  enableGrouping?: boolean;
  enableAggregation?: boolean;
  enablePinnedColumns?: boolean;
  enableExcelExport?: boolean;
  enablePdfExport?: boolean;
  
  // Configuration
  pageSize?: number;
  rowKey?: keyof T | ((row: T) => string | number);
  maxHeight?: string | number;
  viewStorageKey?: string; // localStorage key for saved views
  
  // Server-side pagination
  serverPagination?: ServerPagination;
  
  // Actions
  rowActions?: RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  onColumnOrderChange?: (columnKeys: string[]) => void;
  onCellEdit?: (row: T, columnKey: string, newValue: unknown) => void;
  
  // Expandable row
  expandedRowContent?: ExpandedRowContent<T>;
  
  // States
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  
  className?: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const defaultCellRenderer = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getRowKey = <T extends Record<string, unknown>>(
  row: T,
  index: number,
  rowKey?: keyof T | ((row: T) => string | number)
): string | number => {
  if (!rowKey) return index;
  if (typeof rowKey === "function") return rowKey(row);
  return String(row[rowKey]);
};

// Calculate aggregation
const calculateAggregate = (
  data: Record<string, unknown>[],
  columnKey: string,
  type: "sum" | "avg" | "count" | "min" | "max"
): number | string => {
  const values = data
    .map(row => row[columnKey])
    .filter(v => typeof v === "number") as number[];
  
  if (values.length === 0) return "-";
  
  switch (type) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return "-";
  }
};

// ========================================
// MAIN COMPONENT
// ========================================

export function AdvancedTable<T extends Record<string, unknown>>({
  data,
  columns: initialColumns,
  title,
  description,
  enableSearch = true,
  enablePagination = true,
  enableExport = true,
  enableSelection = false,
  enableColumnVisibility = false,
  enableStickyHeader = false,
  enableRowExpansion = false,
  enableColumnResize = false,
  enableColumnReorder = false,
  enableInlineEdit = false,
  enableKeyboardNavigation = false,
  enableSavedViews = false,
  enableGrouping = false,
  enableAggregation = false,
  enablePinnedColumns = false,
  enableExcelExport = false,
  enablePdfExport = false,
  pageSize: initialPageSize = 10,
  rowKey,
  maxHeight,
  viewStorageKey,
  serverPagination,
  rowActions,
  bulkActions,
  onRowClick,
  onSelectionChange,
  onColumnOrderChange,
  onCellEdit,
  expandedRowContent,
  loading = false,
  emptyTitle = "No data available",
  emptyDescription = "There are no records to display at this time.",
  emptyIcon,
  className = "",
}: AdvancedTableProps<T>) {
  
  // ========================================
  // STATE
  // ========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string | number>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | number | null>(null);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const visibility: Record<string, boolean> = {};
    initialColumns.forEach(col => {
      visibility[col.key] = col.visible !== false;
    });
    return visibility;
  });
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => 
    initialColumns.map(col => col.key)
  );
  
  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    initialColumns.forEach(col => {
      if (typeof col.width === 'number') {
        widths[col.key] = col.width;
      } else {
        widths[col.key] = col.minWidth || 150;
      }
    });
    return widths;
  });
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowKey: string | number; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState<unknown>(null);
  
  // Drag state for column reordering
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Keyboard navigation state
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [focusedColIndex, setFocusedColIndex] = useState<number>(0);
  
  // Grouping state
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Export menu state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  
  // Resize state
  const resizeRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);
  
  // Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // ========================================
  // SAVED VIEWS
  // ========================================
  
  // Load saved view on mount
  useEffect(() => {
    if (enableSavedViews && viewStorageKey) {
      const saved = localStorage.getItem(`table-view-${viewStorageKey}`);
      if (saved) {
        try {
          const state: TableViewState = JSON.parse(saved);
          setColumnOrder(state.columnOrder);
          setColumnVisibility(state.columnVisibility);
          setColumnWidths(state.columnWidths);
          if (state.sortKey) setSortKey(state.sortKey);
          setSortDirection(state.sortDirection);
        } catch {
          // Invalid saved state, ignore
        }
      }
    }
  }, [enableSavedViews, viewStorageKey]);
  
  const saveView = useCallback(() => {
    if (enableSavedViews && viewStorageKey) {
      const state: TableViewState = {
        columnOrder,
        columnVisibility,
        columnWidths,
        sortKey,
        sortDirection,
      };
      localStorage.setItem(`table-view-${viewStorageKey}`, JSON.stringify(state));
    }
  }, [enableSavedViews, viewStorageKey, columnOrder, columnVisibility, columnWidths, sortKey, sortDirection]);
  
  const resetView = useCallback(() => {
    if (enableSavedViews && viewStorageKey) {
      localStorage.removeItem(`table-view-${viewStorageKey}`);
      // Reset to defaults
      setColumnOrder(initialColumns.map(col => col.key));
      const visibility: Record<string, boolean> = {};
      const widths: Record<string, number> = {};
      initialColumns.forEach(col => {
        visibility[col.key] = col.visible !== false;
        widths[col.key] = typeof col.width === 'number' ? col.width : (col.minWidth || 150);
      });
      setColumnVisibility(visibility);
      setColumnWidths(widths);
      setSortKey(null);
      setSortDirection("asc");
    }
  }, [enableSavedViews, viewStorageKey, initialColumns]);

  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  // Get visible columns in order with pinned columns
  const visibleColumns = useMemo(() => {
    const cols = columnOrder
      .filter(key => columnVisibility[key])
      .map(key => initialColumns.find(col => col.key === key)!)
      .filter(Boolean);
    
    if (enablePinnedColumns) {
      const leftPinned = cols.filter(c => c.pinned === "left");
      const rightPinned = cols.filter(c => c.pinned === "right");
      const unpinned = cols.filter(c => !c.pinned);
      return [...leftPinned, ...unpinned, ...rightPinned];
    }
    
    return cols;
  }, [columnOrder, columnVisibility, initialColumns, enablePinnedColumns]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      visibleColumns.some((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [data, visibleColumns, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Group data if grouping is enabled
  const groupedData = useMemo(() => {
    if (!enableGrouping || !groupByColumn) return null;
    
    const groups: Record<string, T[]> = {};
    sortedData.forEach(row => {
      const groupValue = String(row[groupByColumn] ?? "Other");
      if (!groups[groupValue]) groups[groupValue] = [];
      groups[groupValue].push(row);
    });
    return groups;
  }, [sortedData, enableGrouping, groupByColumn]);

  // Paginate data (client-side)
  const paginatedData = useMemo(() => {
    if (serverPagination) return sortedData;
    if (!enablePagination) return sortedData;
    const startIndex = (currentPage - 1) * initialPageSize;
    return sortedData.slice(startIndex, startIndex + initialPageSize);
  }, [sortedData, currentPage, initialPageSize, enablePagination, serverPagination]);

  const totalPages = serverPagination 
    ? Math.ceil(serverPagination.total / serverPagination.pageSize)
    : Math.ceil(sortedData.length / initialPageSize);
  
  const totalItems = serverPagination ? serverPagination.total : sortedData.length;
  const effectivePage = serverPagination ? serverPagination.page : currentPage;
  const effectivePageSize = serverPagination ? serverPagination.pageSize : initialPageSize;

  // Get selected rows
  const selectedRows = useMemo(() => {
    return data.filter((row, index) => 
      selectedRowKeys.has(getRowKey(row, index, rowKey))
    );
  }, [data, selectedRowKeys, rowKey]);

  // Check if all visible rows are selected
  const allSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row, index) => 
      selectedRowKeys.has(getRowKey(row, index, rowKey))
    );
  }, [paginatedData, selectedRowKeys, rowKey]);

  // Calculate aggregations
  const aggregations = useMemo(() => {
    if (!enableAggregation) return null;
    
    const result: Record<string, number | string> = {};
    visibleColumns.forEach(col => {
      if (col.aggregate) {
        result[col.key] = calculateAggregate(sortedData as Record<string, unknown>[], col.key, col.aggregate);
      }
    });
    return result;
  }, [enableAggregation, visibleColumns, sortedData]);

  // ========================================
  // HANDLERS
  // ========================================
  
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey, sortDirection]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const headers = visibleColumns.map((col) => col.header).join(",");
    const rows = sortedData.map((row) =>
      visibleColumns.map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return "";
        const strValue = String(value);
        if (strValue.includes(",") || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${title || "table-data"}-${new Date().toISOString().split("T")[0]}.csv`);
    setExportMenuOpen(false);
  }, [visibleColumns, sortedData, title]);

  const handleExportExcel = useCallback(() => {
    const worksheetData = [
      visibleColumns.map(col => col.header),
      ...sortedData.map(row => visibleColumns.map(col => row[col.key] ?? ""))
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${title || "table-data"}-${new Date().toISOString().split("T")[0]}.xlsx`);
    setExportMenuOpen(false);
  }, [visibleColumns, sortedData, title]);

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF();
    
    const tableData = sortedData.map(row => 
      visibleColumns.map(col => String(row[col.key] ?? "-"))
    );
    
    autoTable(doc, {
      head: [visibleColumns.map(col => col.header)],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`${title || "table-data"}-${new Date().toISOString().split("T")[0]}.pdf`);
    setExportMenuOpen(false);
  }, [visibleColumns, sortedData, title]);

  const handleSelectRow = useCallback((rowKeyValue: string | number) => {
    setSelectedRowKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKeyValue)) {
        newSet.delete(rowKeyValue);
      } else {
        newSet.add(rowKeyValue);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedRowKeys((prev) => {
        const newSet = new Set(prev);
        paginatedData.forEach((row, index) => {
          newSet.delete(getRowKey(row, index, rowKey));
        });
        return newSet;
      });
    } else {
      setSelectedRowKeys((prev) => {
        const newSet = new Set(prev);
        paginatedData.forEach((row, index) => {
          newSet.add(getRowKey(row, index, rowKey));
        });
        return newSet;
      });
    }
  }, [allSelected, paginatedData, rowKey]);

  const handleClearSelection = useCallback(() => {
    setSelectedRowKeys(new Set());
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (serverPagination) {
      serverPagination.onPageChange(page);
    } else {
      setCurrentPage(page);
    }
  }, [serverPagination]);

  const handleColumnVisibilityToggle = useCallback((colKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  }, []);

  const handleRowExpand = useCallback((rowKeyValue: string | number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowKeyValue)) {
        newSet.delete(rowKeyValue);
      } else {
        newSet.add(rowKeyValue);
      }
      return newSet;
    });
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    resizeRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || 150
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = moveEvent.clientX - resizeRef.current.startX;
      const newWidth = Math.max(80, resizeRef.current.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizeRef.current!.colKey]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const handleDragStart = useCallback((colKey: string) => {
    setDraggedColumn(colKey);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverColumn(colKey);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggedColumn && dragOverColumn && draggedColumn !== dragOverColumn) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        const draggedIdx = newOrder.indexOf(draggedColumn);
        const targetIdx = newOrder.indexOf(dragOverColumn);
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedColumn);
        onColumnOrderChange?.(newOrder);
        return newOrder;
      });
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  }, [draggedColumn, dragOverColumn, onColumnOrderChange]);

  const handleStartEdit = useCallback((rowKeyValue: string | number, colKey: string, currentValue: unknown) => {
    setEditingCell({ rowKey: rowKeyValue, colKey });
    setEditValue(currentValue);
  }, []);

  const handleSaveEdit = useCallback((row: T) => {
    if (editingCell && onCellEdit) {
      onCellEdit(row, editingCell.colKey, editValue);
    }
    setEditingCell(null);
    setEditValue(null);
  }, [editingCell, editValue, onCellEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue(null);
  }, []);

  const handleGroupToggle = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selectedRows);
  }, [selectedRows, onSelectionChange]);

  // ========================================
  // KEYBOARD NAVIGATION 
  // ========================================
  
  useEffect(() => {
    if (!enableKeyboardNavigation) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableContainerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          {
            const newIndex = Math.min(focusedRowIndex + 1, paginatedData.length - 1);
            setFocusedRowIndex(newIndex);
            // Also select the new row (single selection mode)
            if (enableSelection && newIndex >= 0 && newIndex < paginatedData.length) {
              const row = paginatedData[newIndex];
              const key = getRowKey(row, newIndex, rowKey);
              setSelectedRowKeys(new Set([key]));
            }
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          {
            const newIndex = Math.max(focusedRowIndex - 1, 0);
            setFocusedRowIndex(newIndex);
            // Also select the new row (single selection mode)
            if (enableSelection && newIndex >= 0 && newIndex < paginatedData.length) {
              const row = paginatedData[newIndex];
              const key = getRowKey(row, newIndex, rowKey);
              setSelectedRowKeys(new Set([key]));
            }
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedColIndex(prev => Math.min(prev + 1, visibleColumns.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedColIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          if (focusedRowIndex >= 0 && focusedRowIndex < paginatedData.length) {
            const row = paginatedData[focusedRowIndex];
            if (onRowClick) {
              onRowClick(row);
            }
          }
          break;
        case " ":
          if (enableSelection && focusedRowIndex >= 0) {
            e.preventDefault();
            // Toggle selection with space (for multi-select)
            const row = paginatedData[focusedRowIndex];
            const key = getRowKey(row, focusedRowIndex, rowKey);
            handleSelectRow(key);
          }
          break;
        case "Escape":
          setFocusedRowIndex(-1);
          if (editingCell) {
            handleCancelEdit();
          }
          break;
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardNavigation, focusedRowIndex, focusedColIndex, paginatedData, visibleColumns, enableSelection, rowKey, onRowClick, editingCell, handleSelectRow, handleCancelEdit]);
  // ========================================
  // RENDER HELPERS
  // ========================================
  
  const hasRowActions = rowActions && rowActions.length > 0;
  const hasBulkActions = bulkActions && bulkActions.length > 0 && selectedRows.length > 0;
  const showExpander = enableRowExpansion && expandedRowContent;
  const showExportMenu = enableExport || enableExcelExport || enablePdfExport;

  // Render a single data row
  const renderDataRow = (row: T, rowIndex: number, globalIndex: number) => {
    const keyValue = getRowKey(row, globalIndex, rowKey);
    const isSelected = selectedRowKeys.has(keyValue);
    const isExpanded = expandedRows.has(keyValue);
    // When keyboard nav is enabled, show highlight for both focused AND selected rows
    const isFocused = enableKeyboardNavigation && focusedRowIndex === rowIndex;
    const showHighlight = isSelected || isFocused;

    return (
      <>
        <TableRow
          key={keyValue}
          className={`
            ${onRowClick ? "cursor-pointer" : ""} 
            ${showHighlight 
              ? "bg-brand-50/50 dark:bg-brand-500/5 border-l-4 border-l-brand-500" 
              : `${rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/30"} hover:bg-gray-100/80 dark:hover:bg-white/[0.04] border-l-4 border-l-transparent hover:border-l-brand-400 dark:hover:border-l-brand-500`
            }
            outline-none focus:outline-none transition-all duration-150
          `}
          tabIndex={enableKeyboardNavigation ? 0 : undefined}
          onFocus={() => {
            if (enableKeyboardNavigation) {
              setFocusedRowIndex(rowIndex);
              // Also select this row when focused via Tab or click
              if (enableSelection) {
                setSelectedRowKeys(new Set([keyValue]));
              }
              // Cancel any inline edit if selecting a different row
              if (editingCell && editingCell.rowKey !== keyValue) {
                handleCancelEdit();
              }
            }
          }}
        >
          {/* Expander */}
          {showExpander && (
            <TableCell className="px-2 py-4 w-10">
              <button
                onClick={() => handleRowExpand(keyValue)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.05]"
              >
                <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            </TableCell>
          )}

          {/* Selection Checkbox */}
          {enableSelection && (
            <TableCell className="px-5 py-4 w-12">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  handleSelectRow(keyValue);
                  // Cancel inline edit if selecting a different row
                  if (editingCell && editingCell.rowKey !== keyValue) {
                    handleCancelEdit();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-brand-500 
                  focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
              />
            </TableCell>
          )}

          {/* Data Cells */}
          {visibleColumns.map((column) => {
            const isEditing = editingCell?.rowKey === keyValue && editingCell?.colKey === column.key;
            const cellValue = row[column.key];
            const isPinnedLeft = enablePinnedColumns && column.pinned === "left";
            const isPinnedRight = enablePinnedColumns && column.pinned === "right";
            
            // Determine background for pinned columns (must inherit row state)
            const pinnedBg = isPinnedLeft || isPinnedRight 
              ? (showHighlight 
                  ? "bg-brand-50/50 dark:bg-brand-500/5" 
                  : "bg-white dark:bg-gray-900")
              : "";
            
            return (
              <TableCell
                key={column.key}
                className={`px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 ${column.className || ""} ${
                  isPinnedLeft || isPinnedRight ? `sticky ${pinnedBg} z-10` : ""
                }`}
                style={{
                  ...(enableColumnResize ? { width: columnWidths[column.key] } : {}),
                  ...(isPinnedLeft ? { left: 0 } : {}),
                  ...(isPinnedRight ? { right: 0 } : {}),
                }}
                onDoubleClick={() => {
                  if (enableInlineEdit && column.editable) {
                    handleStartEdit(keyValue, column.key, cellValue);
                  }
                }}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    {column.editRender ? (
                      column.editRender(editValue, row, setEditValue)
                    ) : (
                      <input
                        type="text"
                        value={String(editValue || '')}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-brand-500 rounded focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(row);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                    )}
                    <button
                      onClick={() => handleSaveEdit(row)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  column.render
                    ? column.render(cellValue, row, rowIndex)
                    : defaultCellRenderer(cellValue)
                )}
              </TableCell>
            );
          })}

          {/* Row Actions */}
          {hasRowActions && (
            <TableCell className="px-5 py-4 text-end w-20">
              <div className="relative inline-block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(actionMenuOpen === keyValue ? null : keyValue);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {actionMenuOpen === keyValue && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setActionMenuOpen(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] rounded-lg shadow-lg z-50 py-1">
                      {rowActions!.filter(action => !action.show || action.show(row)).map((action, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                            setActionMenuOpen(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            action.variant === "danger"
                              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                          }`}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </TableCell>
          )}
        </TableRow>

        {/* Expanded Row Content */}
        {showExpander && isExpanded && (
          <TableRow key={`${keyValue}-expanded`}>
            <TableCell 
              className="px-5 py-4 bg-gray-50 dark:bg-white/[0.02]"
              colSpan={
                (showExpander ? 1 : 0) + 
                (enableSelection ? 1 : 0) + 
                visibleColumns.length + 
                (hasRowActions ? 1 : 0)
              }
            >
              {expandedRowContent!.render(row)}
            </TableCell>
          </TableRow>
        )}
      </>
    );
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] ${className}`}>
      
      {/* HEADER / TOOLBAR */}
      {(title || enableSearch || showExportMenu || enableColumnVisibility || enableSavedViews || enableGrouping || hasBulkActions) && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title Section */}
            <div>
              {title && (
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Bulk Actions */}
              {hasBulkActions && (
                <div className="flex items-center gap-2 mr-2 pr-4 border-r border-gray-200 dark:border-white/[0.1]">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedRows.length} selected
                  </span>
                  {bulkActions!.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => action.onClick(selectedRows)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        action.variant === "danger"
                          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                  <button
                    onClick={handleClearSelection}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Search */}
              {enableSearch && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-4 py-2 w-full sm:w-48 border border-gray-200 rounded-lg text-sm text-gray-700 
                      placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
                      dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-gray-300"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              )}

              {/* Grouping Selector */}
              {enableGrouping && (
                <select
                  value={groupByColumn || ""}
                  onChange={(e) => setGroupByColumn(e.target.value || null)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 
                    focus:outline-none focus:ring-2 focus:ring-brand-500/20 
                    dark:bg-white/[0.03] dark:border-white/[0.05] dark:text-gray-300"
                >
                  <option value="">No grouping</option>
                  {initialColumns.filter(c => c.groupable !== false).map(col => (
                    <option key={col.key} value={col.key}>{col.header}</option>
                  ))}
                </select>
              )}

              {/* Column Visibility */}
              {enableColumnVisibility && (
                <div className="relative">
                  <button
                    onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 
                      rounded-lg hover:bg-gray-50 transition-colors dark:text-gray-300 dark:border-white/[0.1] dark:hover:bg-white/[0.05]"
                  >
                    <Columns3 className="h-4 w-4" />
                    <span>Columns</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  
                  {columnVisibilityOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setColumnVisibilityOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] rounded-lg shadow-lg z-50 py-2 max-h-64 overflow-auto">
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.05]">
                          <span className="text-xs font-medium text-gray-500 uppercase">Toggle Columns</span>
                        </div>
                        {initialColumns.map((col) => (
                          <label
                            key={col.key}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={columnVisibility[col.key]}
                              onChange={() => handleColumnVisibilityToggle(col.key)}
                              className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{col.header}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Saved Views */}
              {enableSavedViews && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={saveView}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-white/[0.05]"
                    title="Save view"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={resetView}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-white/[0.05]"
                    title="Reset view"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Export Menu */}
              {showExportMenu && (
                <div className="relative">
                  <button
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-500 
                      rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] rounded-lg shadow-lg z-50 py-1">
                        {enableExport && (
                          <button
                            onClick={handleExportCSV}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                          >
                            <FileText className="h-4 w-4" />
                            CSV
                          </button>
                        )}
                        {enableExcelExport && (
                          <button
                            onClick={handleExportExcel}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Excel
                          </button>
                        )}
                        {enablePdfExport && (
                          <button
                            onClick={handleExportPDF}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                          >
                            <FileText className="h-4 w-4" />
                            PDF
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE - Skeleton Rows */}
      {loading && (
        <div className="overflow-hidden">
          <div className="animate-pulse">
            {/* Skeleton header */}
            <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
              {visibleColumns.slice(0, 5).map((col, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" style={{ maxWidth: 150 }} />
              ))}
            </div>
            {/* Skeleton rows */}
            {[...Array(5)].map((_, rowIdx) => (
              <div 
                key={rowIdx} 
                className={`flex gap-4 p-4 border-b border-gray-100 dark:border-gray-700 ${
                  rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                }`}
              >
                {visibleColumns.slice(0, 5).map((col, colIdx) => (
                  <div 
                    key={colIdx} 
                    className={`h-4 rounded flex-1 ${
                      colIdx === 0 
                        ? 'bg-gray-300 dark:bg-gray-600' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    style={{ 
                      maxWidth: colIdx === 0 ? 200 : 120,
                      animationDelay: `${(rowIdx * 50) + (colIdx * 30)}ms`
                    }} 
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 text-brand-500 animate-spin mr-2" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading data...</span>
          </div>
        </div>
      )}

      {/* TABLE */}
      {!loading && (
        <div 
          ref={tableContainerRef}
          className="max-w-full overflow-x-auto"
          style={enableStickyHeader && maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
          tabIndex={enableKeyboardNavigation ? 0 : undefined}
        >
          <Table ref={tableRef}>
            {/* Table Header */}
            <TableHeader 
              className={`border-b border-gray-100 dark:border-white/[0.05] ${
                enableStickyHeader ? 'sticky top-0 bg-white dark:bg-gray-900 z-20' : ''
              }`}
            >
              <TableRow>
                {/* Expander Header */}
                {showExpander && (
                  <TableCell isHeader className="px-2 py-3 w-10" />
                )}

                {/* Selection Checkbox Header */}
                {enableSelection && (
                  <TableCell isHeader className="px-5 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-brand-500 
                        focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </TableCell>
                )}

                {/* Column Headers */}
                {visibleColumns.map((column) => {
                  const isPinnedLeft = enablePinnedColumns && column.pinned === "left";
                  const isPinnedRight = enablePinnedColumns && column.pinned === "right";
                  
                  return (
                    <TableCell
                      key={column.key}
                      isHeader
                      className={`px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 relative ${
                        column.sortable ? "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" : ""
                      } ${column.className || ""} ${
                        dragOverColumn === column.key ? "bg-brand-50 dark:bg-brand-500/10" : ""
                      } ${isPinnedLeft || isPinnedRight ? "sticky bg-white dark:bg-gray-900 z-20" : ""}`}
                      style={{
                        ...(enableColumnResize ? { width: columnWidths[column.key] } : {}),
                        ...(isPinnedLeft ? { left: 0 } : {}),
                        ...(isPinnedRight ? { right: 0 } : {}),
                      }}
                      draggable={enableColumnReorder}
                      onDragStart={() => handleDragStart(column.key)}
                      onDragOver={(e) => handleDragOver(e, column.key)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center gap-1">
                        {enableColumnReorder && (
                          <GripVertical className="h-3 w-3 text-gray-300 cursor-grab" />
                        )}
                        <div
                          className="flex items-center gap-1 flex-1"
                          onClick={() => column.sortable && handleSort(column.key)}
                        >
                          {column.header}
                          {column.sortable && (
                            <span className="flex flex-col">
                              <ChevronUp
                                className={`h-3 w-3 -mb-1 ${
                                  sortKey === column.key && sortDirection === "asc"
                                    ? "text-brand-500"
                                    : "text-gray-300"
                                }`}
                              />
                              <ChevronDown
                                className={`h-3 w-3 ${
                                  sortKey === column.key && sortDirection === "desc"
                                    ? "text-brand-500"
                                    : "text-gray-300"
                                }`}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Resize Handle */}
                      {enableColumnResize && (
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-500 opacity-0 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleResizeStart(e, column.key)}
                        />
                      )}
                    </TableCell>
                  );
                })}

                {/* Actions Header */}
                {hasRowActions && (
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400 w-20"
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedData.length === 0 && !groupedData ? (
                /* Empty State */
                <TableRow>
                  <TableCell 
                    className="px-5 py-12 text-center"
                    colSpan={
                      (showExpander ? 1 : 0) + 
                      (enableSelection ? 1 : 0) + 
                      visibleColumns.length + 
                      (hasRowActions ? 1 : 0)
                    }
                  >
                    <div className="flex flex-col items-center gap-3">
                      {emptyIcon || <Inbox className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {searchQuery ? "No results found" : emptyTitle}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          {searchQuery ? `No matches for "${searchQuery}"` : emptyDescription}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : groupedData ? (
                /* Grouped Rows */
                Object.entries(groupedData).map(([groupKey, groupRows]) => (
                  <>
                    {/* Group Header */}
                    <TableRow key={`group-${groupKey}`} className="bg-gray-50 dark:bg-white/[0.02]">
                      <TableCell
                        colSpan={
                          (showExpander ? 1 : 0) + 
                          (enableSelection ? 1 : 0) + 
                          visibleColumns.length + 
                          (hasRowActions ? 1 : 0)
                        }
                        className="px-5 py-3"
                      >
                        <button
                          onClick={() => handleGroupToggle(groupKey)}
                          className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300"
                        >
                          <ChevronRightIcon className={`h-4 w-4 transition-transform ${!collapsedGroups.has(groupKey) ? 'rotate-90' : ''}`} />
                          {groupByColumn && initialColumns.find(c => c.key === groupByColumn)?.header}: {groupKey}
                          <span className="text-sm text-gray-400 font-normal">({groupRows.length})</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Group Rows */}
                    {!collapsedGroups.has(groupKey) && groupRows.map((row, idx) => 
                      renderDataRow(row, idx, data.indexOf(row))
                    )}
                  </>
                ))
              ) : (
                /* Regular Rows */
                paginatedData.map((row, rowIndex) => renderDataRow(row, rowIndex, rowIndex))
              )}
            </TableBody>

            {/* Table Footer with Aggregations */}
            {enableAggregation && aggregations && Object.keys(aggregations).length > 0 && (
              <tfoot className="border-t-2 border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.02]">
                <TableRow>
                  {showExpander && <TableCell className="px-2 py-3" />}
                  {enableSelection && <TableCell className="px-5 py-3" />}
                  {visibleColumns.map(column => (
                    <TableCell 
                      key={column.key}
                      className="px-5 py-3 font-medium text-gray-700 dark:text-gray-300"
                    >
                      {aggregations[column.key] !== undefined && (
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 uppercase">{column.aggregate}:</span>
                          {typeof aggregations[column.key] === 'number' 
                            ? aggregations[column.key].toLocaleString()
                            : aggregations[column.key]
                          }
                        </span>
                      )}
                    </TableCell>
                  ))}
                  {hasRowActions && <TableCell className="px-5 py-3" />}
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      )}

      {/* PAGINATION */}
      {!loading && enablePagination && totalPages > 1 && !groupedData && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(effectivePage - 1) * effectivePageSize + 1} to{" "}
            {Math.min(effectivePage * effectivePageSize, totalItems)} of{" "}
            {totalItems} entries
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, effectivePage - 1))}
              disabled={effectivePage === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 
                disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (effectivePage <= 3) {
                  pageNum = i + 1;
                } else if (effectivePage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = effectivePage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      effectivePage === pageNum
                        ? "bg-brand-500 text-white"
                        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(Math.min(totalPages, effectivePage + 1))}
              disabled={effectivePage === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 
                disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export common action icons for convenience
export const TableIcons = {
  Edit,
  Trash: Trash2,
  View: Eye,
  More: MoreHorizontal,
};

export default AdvancedTable;
