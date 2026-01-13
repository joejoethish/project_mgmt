import { useDrag } from 'react-dnd';
import { ItemTypes } from './constants';

export interface Task {
    task_id: string;
    title: string;
    description: string;
    status_id: string;
    priority_id: string;
    assigned_to: string;
    position: number;
    external_url?: string; // Zoho Connect task URL
    tags?: {
        tag_id: string;
        name: string;
        color: string;
    }[];
}

interface Member {
    member_id: string;
    first_name: string;
    last_name: string;
}

interface TaskCardProps {
    task: Task;
    members: Member[];
    onClick?: () => void;
}

export default function TaskCard({ task, members, onClick }: TaskCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK,
        item: { id: task.task_id, status_id: task.status_id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const getAssigneeInitials = (memberId: string) => {
        const member = members.find(m => m.member_id === memberId);
        if (!member) return '?';
        return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
    };

    const getAssigneeName = (memberId: string) => {
        const member = members.find(m => m.member_id === memberId);
        return member ? `${member.first_name} ${member.last_name}` : 'Unassigned';
    };

    return (
        <div
            ref={drag as unknown as React.Ref<HTMLDivElement>}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            onClick={onClick}
            className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
        >
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {task.title}
            </div>
            {task.external_url && (
                <a
                    href={task.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded text-[10px] font-bold shadow-sm hover:from-orange-600 hover:to-red-600 transition"
                    title="Open in Zoho Connect"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <text x="5" y="16" fontSize="12" fontWeight="bold">Z</text>
                    </svg>
                    Zoho Task
                </a>
            )}
            {task.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {task.description}
                </div>
            )}
            <div className="flex justify-between items-center">
                {task.assigned_to ? (
                    <div className="flex items-center gap-2" title={getAssigneeName(task.assigned_to)}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white dark:border-gray-700 text-[10px] text-white flex items-center justify-center font-medium">
                            {getAssigneeInitials(task.assigned_to)}
                        </div>
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-700 text-[10px] text-gray-400 flex items-center justify-center">
                        ?
                    </div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    0
                </div>
            </div>
            {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {task.tags.slice(0, 3).map(tag => (
                        <span 
                            key={tag.tag_id}
                            className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                            {tag.name}
                        </span>
                    ))}
                    {task.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-300">
                            +{task.tags.length - 3}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

