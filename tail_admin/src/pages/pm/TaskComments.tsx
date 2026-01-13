import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Attachment {
    task_attachment_id: string;
    file_name: string;
    file_storage_path: string;
    mime_type: string;
}

interface Comment {
    task_comment_id: string;
    task_id: string;
    member_id: string;
    comment: string;
    parent_comment_id: string | null;
    attachments: Attachment[];
    likes_count: number;
    liked_by: string[];
    created_at: string;
    edited_at: string | null;
}

interface Member {
    member_id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
}

interface TaskCommentsProps {
    taskId: string;
    currentMemberId?: string;
}

// Helper functions moved outside
const getInitials = (member: Member | undefined): string => {
    if (!member) return '?';
    return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
};

const getMemberName = (member: Member | undefined): string => {
    if (!member) return 'Unknown User';
    return `${member.first_name} ${member.last_name}`.trim();
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

// Extracted Component
const CommentItem = ({ 
    comment, 
    allComments,
    depth = 0, 
    currentMemberId, 
    members,
    onLike,
    onDelete,
    onReply,
    deletingId 
}: { 
    comment: Comment, 
    allComments: Comment[],
    depth?: number,
    currentMemberId?: string,
    members: Member[],
    onLike: (id: string) => void,
    onDelete: (id: string) => void,
    onReply: (e: React.FormEvent, parentId: string, text: string) => void,
    deletingId: string | null
}) => {
    const member = members.find(m => m.member_id === comment.member_id);
    const replies = allComments.filter(c => c.parent_comment_id === comment.task_comment_id);
    const isLiked = currentMemberId ? comment.liked_by.includes(currentMemberId) : false;
    
    const [replyText, setReplyText] = useState('');
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (confirmDelete) {
            const timer = setTimeout(() => setConfirmDelete(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirmDelete]);

    return (
        <div className={`group flex gap-3 ${depth > 0 ? 'ml-10 mt-3 relative before:content-[""] before:absolute before:-left-6 before:top-4 before:w-4 before:h-px before:bg-gray-300 dark:before:bg-gray-600' : 'mt-4'}`}>
            {/* Avatar */}
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                    {getInitials(member)}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {getMemberName(member)}
                        </span>
                        <span className="text-xs text-gray-400">
                            {formatDate(comment.created_at)}
                        </span>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                        {comment.comment}
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-4 mt-1 ml-2">
                    <button 
                        onClick={() => onLike(comment.task_comment_id)}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                            isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <svg className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {comment.likes_count > 0 ? comment.likes_count : 'Like'}
                    </button>
                    
                    {depth === 0 && (
                        <button 
                            onClick={() => setShowReplyForm(!showReplyForm)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
                        >
                            Reply
                        </button>
                    )}

                    {replies.length === 0 && currentMemberId === comment.member_id && (
                        <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmDelete) {
                                        onDelete(comment.task_comment_id);
                                    } else {
                                        setConfirmDelete(true);
                                    }
                                }}
                                disabled={deletingId === comment.task_comment_id}
                                className={`text-xs font-medium transition-all ${
                                    deletingId === comment.task_comment_id 
                                        ? 'text-gray-300 cursor-wait' 
                                        : confirmDelete 
                                            ? 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded' 
                                            : 'text-gray-400 hover:text-red-500'
                                }`}
                        >
                            {deletingId === comment.task_comment_id 
                                ? 'Deleting...' 
                                : confirmDelete 
                                    ? 'Confirm?' 
                                    : 'Delete'}
                        </button>
                    )}
                </div>

                {/* Reply Form */}
                {showReplyForm && (
                    <div className="mt-3 ml-2 flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400">
                            You
                            </div>
                            <form 
                            onSubmit={(e) => {
                                onReply(e, comment.task_comment_id, replyText);
                                setReplyText('');
                                setShowReplyForm(false);
                            }} 
                            className="flex-1"
                        >
                            <div className="relative">
                                <input
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-20 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                                    <button 
                                        type="button"
                                        onClick={() => setShowReplyForm(false)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Cancel"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={!replyText.trim()}
                                        className="p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            </form>
                    </div>
                )}

                {/* Nested Replies */}
                {replies.map(reply => (
                    <CommentItem 
                        key={reply.task_comment_id} 
                        comment={reply} 
                        allComments={allComments}
                        depth={depth + 1}
                        currentMemberId={currentMemberId}
                        members={members}
                        onLike={onLike}
                        onDelete={onDelete}
                        onReply={onReply}
                        deletingId={deletingId}
                    />
                ))}
            </div>
        </div>
    );
};

export default function TaskComments({ taskId, currentMemberId }: TaskCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const commentsEndRef = useRef<HTMLDivElement>(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await axios.get(`http://192.168.1.26:8000/api/pm/taskcomments/?task_id=${taskId}&ordering=created_at`);
            setComments(res.data);
        } catch (err) {
            console.error('Failed to load comments', err);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    const fetchMembers = useCallback(async () => {
        try {
            const res = await axios.get('http://192.168.1.26:8000/api/pm/members/');
            setMembers(res.data);
        } catch (err) {
            console.error('Failed to load members', err);
        }
    }, []);

    useEffect(() => {
        fetchComments();
        fetchMembers();
    }, [fetchComments, fetchMembers]);

    const handleSubmit = async (e: React.FormEvent, parentId: string | null = null, content: string = newComment) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        try {
            await axios.post('http://192.168.1.26:8000/api/pm/taskcomments/', {
                task_id: taskId,
                member_id: currentMemberId || null,
                comment: content.trim(),
                parent_comment_id: parentId
            });
            
            // Refetch to ensure sync
            await fetchComments();
            
            if (!parentId) {
                setNewComment('');
            }
            toast.success('Comment added');
        } catch {
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (commentId: string) => {
        if (!currentMemberId) {
            toast.error('You must be logged in to like');
            return;
        }

        try {
            const url = `http://192.168.1.26:8000/api/pm/taskcomments/${commentId}/like/`;
            await axios.post(url, {
                member_id: currentMemberId
            });
            // Update local state without full refetch
            setComments(comments.map(c => {
                if (c.task_comment_id === commentId) {
                    const isLiked = c.liked_by.includes(currentMemberId);
                    return {
                        ...c,
                        likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1,
                        liked_by: isLiked ? c.liked_by.filter(id => id !== currentMemberId) : [...c.liked_by, currentMemberId]
                    };
                }
                return c;
            }));
        } catch (err) {
            console.error('Like failed', err);
            toast.error('Failed to like comment');
        }
    };

    const handleDelete = async (commentId: string) => {
        console.log('handleDelete called', commentId);
        
        // Confirmation is now handled in the UI button state
        console.log('Delete confirmed via UI, processing...');
        setDeletingId(commentId);
        
        // Optimistic update
        const previousComments = [...comments];
        setComments(current => current.filter(c => c.task_comment_id !== commentId && c.parent_comment_id !== commentId));

        try {
            await axios.delete(`http://192.168.1.26:8000/api/pm/taskcomments/${commentId}/`, {
                data: { member_id: currentMemberId }
            });
            console.log('Delete API success');
            toast.success('Comment deleted');
            // background re-fetch just in case
            fetchComments();
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('Failed to delete comment');
            // Revert on failure
            setComments(previousComments);
        } finally {
            setDeletingId(null);
        }
    };

    // organize into tree
    const rootComments = comments.filter(c => !c.parent_comment_id);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4 p-4">
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 mb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    Comments
                    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                        {comments.length}
                    </span>
                </h3>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {rootComments.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 font-medium">No comments yet</p>
                        <p className="text-gray-400 text-sm mt-1">Start the conversation!</p>
                    </div>
                ) : (
                    rootComments.map(comment => (
                        <CommentItem 
                            key={comment.task_comment_id} 
                            comment={comment} 
                            allComments={comments}
                            currentMemberId={currentMemberId}
                            members={members}
                            onLike={handleLike}
                            onDelete={handleDelete}
                            onReply={handleSubmit}
                            deletingId={deletingId}
                        />
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>

            {/* Add Comment Form */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={(e) => handleSubmit(e)} className="relative">
                    <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full bg-gray-100 dark:bg-gray-900 border-0 rounded-xl px-4 py-3 pr-24 max-h-32 min-h-[50px] focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                        <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                            title="Attach file"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:shadow-none"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
                <div className="text-[10px] text-gray-400 mt-2 flex justify-between px-1">
                    <span>Markdown supported</span>
                    <span>Press Enter to send</span>
                </div>
            </div>
        </div>
    );
}

