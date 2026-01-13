import { useDrop } from 'react-dnd';
import { ItemTypes } from './constants';

interface KanbanColumnProps<T> {
    statusId: string;
    title: string;
    count: number;
    totalPoints?: number;
    sortOrder: number;
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    onTaskDrop: (taskId: string, newStatusId: string) => void;
    onAddClick?: (statusId: string) => void;
    isDropDisabled?: boolean;
}

export default function KanbanColumn<T>({ 
    statusId, 
    title, 
    count, 
    totalPoints = 0,
    sortOrder, 
    items, 
    renderItem, 
    onTaskDrop, 
    onAddClick,
    isDropDisabled = false
}: KanbanColumnProps<T>) {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        canDrop: () => !isDropDisabled,
        drop: (item: { id: string }) => onTaskDrop(item.id, statusId),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    const getColumnColor = (sortOrder: number) => {
        const colors = [
            'from-gray-400 to-gray-500',
            'from-blue-400 to-blue-500',
            'from-yellow-400 to-orange-500',
            'from-green-400 to-emerald-500',
            'from-purple-400 to-purple-500'
        ];
        return colors[sortOrder - 1] || colors[0];
    };

    return (
        <div 
            ref={drop as unknown as React.Ref<HTMLDivElement>}
            className={`w-80 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800/50 rounded-xl overflow-hidden max-h-[calc(100vh-220px)] transition-colors ${
                isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
        >
            {/* Column Header */}
            <div className={`bg-gradient-to-r ${getColumnColor(sortOrder)} px-4 py-3 text-white`}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold">{title}</h3>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                        {count} items
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs text-white/90 font-medium">
                     <span>Total Load</span>
                     <span>⚡ {totalPoints} pts</span>
                </div>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {items.map(item => renderItem(item))}
                
                {items.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        No tasks
                    </div>
                )}
            </div>
            
            {/* Add Task Button */}
            {onAddClick && (
                <button 
                    onClick={() => onAddClick(statusId)}
                    className="m-3 mt-0 py-2.5 flex items-center justify-center text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition font-medium"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Task
                </button>
            )}
        </div>
    );
}

