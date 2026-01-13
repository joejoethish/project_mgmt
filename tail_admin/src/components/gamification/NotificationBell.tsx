import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';

interface Notification {
    notification_id: string;
    type: string;
    title: string;
    message: string;
    icon: string;
    is_read: boolean;
    link: string | null;
    created_at: string;
}

interface NotificationBellProps {
    memberId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ memberId }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`http://192.168.1.26:8000/api/gamification/notifications/?member_id=${memberId}`);
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unread_count);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [memberId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllAsRead = async () => {
        try {
            await axios.post('http://192.168.1.26:8000/api/gamification/notifications/', {
                member_id: memberId,
                mark_all: true
            });
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <Bell className="mx-auto h-8 w-8 text-gray-300" />
                                <p className="mt-2">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <a
                                    key={n.notification_id}
                                    href={n.link || '#'}
                                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                        !n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                                    }`}
                                >
                                    <span className="text-2xl">{n.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''} text-gray-900 dark:text-white truncate`}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{n.message}</p>
                                        <p className="mt-1 text-xs text-gray-400">{formatTime(n.created_at)}</p>
                                    </div>
                                    {!n.is_read && (
                                        <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500"></span>
                                    )}
                                </a>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
                        <a href="/impact" className="block text-center text-sm text-indigo-600 hover:text-indigo-700">
                            View all activity
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

