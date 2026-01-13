import { useDrag } from 'react-dnd';
import { ItemTypes } from './constants';

export interface IterationTask {
    iteration_task_id: string;
    task: string;
    priority_points: number;
    notes: string;
    task_details: {
        task_id: string;
        title: string;
        description: string;
        status_id: string;
        status_name: string;
        priority_name: string;
        priority_color?: string;
        assigned_to: {
            id: string;
            name: string;
            avatar: string | null;
            initials: string;
        } | null;
    };
    project_details: {
        project_id: string;
        name: string;
    } | null;
}

interface IterationTaskCardProps {
    task: IterationTask;
    onRemove?: (id: string) => void;
    onClick?: () => void;
}

export default function IterationTaskCard({ task, onRemove, onClick }: IterationTaskCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { id: task.task_details?.task_id, status_id: task.task_details?.status_id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag as unknown as React.Ref<HTMLDivElement>}
            style={{ 
                opacity: isDragging ? 0.5 : 1,
                borderLeft: task.task_details?.priority_color ? `4px solid ${task.task_details.priority_color}` : '1px solid #e5e7eb'
            }}
            className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border-t border-r border-b border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white pr-14">
                    {task.task_details?.title}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 pl-2 rounded">
                    {onClick && (
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded"
                            title="Edit Task"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    )}
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(task.iteration_task_id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title="Remove from Iteration"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            {task.project_details && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    📁 {task.project_details.name}
                </div>
            )}
            {task.priority_points > 0 && (
                <div className="text-xs text-gray-500">
                    ⚡ {task.priority_points} pts
                </div>
            )}
            {task.task_details?.assigned_to && (
                <div className="absolute bottom-4 right-4" title={task.task_details.assigned_to.name}>
                    {task.task_details.assigned_to.avatar ? (
                        <img 
                            src={task.task_details.assigned_to.avatar} 
                            alt={task.task_details.assigned_to.name}
                            className="w-6 h-6 rounded-full border border-gray-200"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300">
                            {task.task_details.assigned_to.initials}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

