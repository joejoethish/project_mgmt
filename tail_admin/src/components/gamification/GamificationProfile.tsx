import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Award, TrendingUp, Zap, Trophy, Flame, Star, Clock, Target, Users, GitCommit, CheckCircle2, BarChart3, Calendar } from 'lucide-react';

// Types
interface GamificationStats {
    total_credits: number;
    current_level: string;
    next_level_at: number;
    progress_percent: number;
    remaining_for_next: number;
    member_name: string;
}

interface ActivityLog {
    transaction_id: string;
    amount: number;
    reason: string;
    rule_name: string;
    created_at: string;
}

interface Achievement {
    achievement_id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    unlocked: boolean;
}

interface StreakData {
    current_streak: number;
    longest_streak: number;
    total_active_days: number;
    last_activity: string | null;
}

interface ProfileData {
    stats: GamificationStats;
    recent_activity: ActivityLog[];
    achievements: Achievement[];
    unlocked_count: number;
    total_achievements: number;
    streak: StreakData;
}

// Badge colors
const badgeColors = [
    'from-rose-400 to-pink-500',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-green-500',
    'from-cyan-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
];

// Mini bar chart
const MiniChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-0.5 h-6">
            {data.map((v, i) => (
                <div key={i} className={`w-1.5 rounded-sm ${color}`} style={{ height: `${Math.max((v / max) * 100, 8)}%` }} />
            ))}
        </div>
    );
};

export const GamificationProfile: React.FC<{ memberId: string }> = ({ memberId }) => {
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`http://192.168.1.26:8000/api/gamification/profile/?member_id=${memberId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to load gamification profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [memberId]);

    if (loading) return (
        <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
        </div>
    );
    if (!data) return <div className="p-4 text-center text-gray-500">Profile not found.</div>;

    const { stats, recent_activity, streak } = data;
    const initials = stats.member_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const weeklyCredits = recent_activity.reduce((sum, a) => sum + a.amount, 0);
    const weekData = [12, 8, 15, 6, 20, 14, 10];

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    return (
        <div className="grid gap-3 lg:grid-cols-4">
            {/* LEFT COLUMN: Profile + Badges */}
            <div className="space-y-3 lg:col-span-1">
                {/* Profile Card */}
                <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white shadow-lg">
                            {initials}
                        </div>
                        <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{stats.member_name}</h2>
                        <p className="text-xs text-gray-500">Software Developer</p>
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            <Star className="h-3 w-3" /> {stats.current_level}
                        </span>
                    </div>

                    {/* Credits */}
                    <div className="mt-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 p-3 text-center text-white">
                        <div className="flex items-center justify-center gap-2">
                            <Zap className="h-5 w-5" />
                            <span className="text-2xl font-black">{stats.total_credits}</span>
                        </div>
                        <p className="text-xs text-white/80">Total Credits</p>
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Level Progress</span>
                            <span>{stats.remaining_for_next} to go</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${stats.progress_percent}%` }} />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">#1</p>
                            <p className="text-[10px] text-gray-500">Rank</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                            <p className="text-lg font-bold text-orange-600">{streak?.current_streak || 0}d</p>
                            <p className="text-[10px] text-gray-500">Streak</p>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">🏆 Badges</h3>
                        <span className="text-xs text-gray-500">{data?.unlocked_count}/{data?.total_achievements}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {data?.achievements?.map((a, idx) => (
                            <div 
                                key={a.achievement_id}
                                title={a.unlocked ? `${a.name}` : `🔒 ${a.name}`}
                                className={`flex flex-col items-center rounded-lg p-2 transition-all hover:scale-105 ${
                                    a.unlocked 
                                        ? `bg-gradient-to-br ${badgeColors[idx % badgeColors.length]} text-white shadow-sm` 
                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                                }`}
                            >
                                <span className="text-xl">{a.icon}</span>
                                <span className="text-[9px] font-medium truncate w-full text-center mt-0.5">{a.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MIDDLE + RIGHT: Stats + Activity */}
            <div className="space-y-3 lg:col-span-3">
                {/* Stats Row */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">This Week</p>
                                <p className="text-xl font-bold text-green-600">+{weeklyCredits}</p>
                            </div>
                            <div className="rounded-lg bg-green-100 p-1.5 text-green-600 dark:bg-green-900/30"><TrendingUp className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-2"><MiniChart data={weekData} color="bg-green-500" /></div>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Tasks Done</p>
                                <p className="text-xl font-bold text-blue-600">{recent_activity.length}</p>
                            </div>
                            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-900/30"><CheckCircle2 className="h-4 w-4" /></div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">Contributing consistently</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Best Streak</p>
                                <p className="text-xl font-bold text-orange-600">{streak?.longest_streak || 0}d</p>
                            </div>
                            <div className="rounded-lg bg-orange-100 p-1.5 text-orange-600 dark:bg-orange-900/30"><Flame className="h-4 w-4" /></div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">{streak?.total_active_days || 0} active days</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Team Impact</p>
                                <p className="text-xl font-bold text-purple-600">Top 5%</p>
                            </div>
                            <div className="rounded-lg bg-purple-100 p-1.5 text-purple-600 dark:bg-purple-900/30"><Users className="h-4 w-4" /></div>
                        </div>
                        <p className="mt-2 text-[10px] text-gray-500">High performer</p>
                    </div>
                </div>

                {/* Contribution Calendar */}
                <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">📊 Contribution Activity</h3>
                        <span className="text-xs text-gray-500">Last 16 weeks</span>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                        {Array.from({ length: 16 }).map((_, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1">
                                {Array.from({ length: 7 }).map((_, dayIdx) => {
                                    const intensity = Math.random();
                                    let bg = 'bg-gray-100 dark:bg-gray-700';
                                    if (intensity > 0.8) bg = 'bg-green-500';
                                    else if (intensity > 0.6) bg = 'bg-green-400';
                                    else if (intensity > 0.4) bg = 'bg-green-300';
                                    else if (intensity > 0.2) bg = 'bg-green-200';
                                    return <div key={dayIdx} className={`h-2.5 w-2.5 rounded-sm ${bg}`} />;
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                        <span>Less</span>
                        <div className="h-2.5 w-2.5 rounded-sm bg-gray-100 dark:bg-gray-700"></div>
                        <div className="h-2.5 w-2.5 rounded-sm bg-green-200"></div>
                        <div className="h-2.5 w-2.5 rounded-sm bg-green-400"></div>
                        <div className="h-2.5 w-2.5 rounded-sm bg-green-500"></div>
                        <span>More</span>
                    </div>
                </div>

                {/* Recent Activity - 2 columns on larger screens */}
                <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">⚡ Recent Activity</h3>
                        <span className="text-xs text-gray-500">{recent_activity.length} transactions</span>
                    </div>
                    {recent_activity.length === 0 ? (
                        <p className="text-sm text-gray-500">No recent activity</p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {recent_activity.map((act, idx) => (
                                <div key={act.transaction_id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm">
                                        <Zap className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{act.reason}</p>
                                        <p className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <Clock className="h-3 w-3" /> {formatTimeAgo(act.created_at)} • {act.rule_name}
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                        +{act.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Skills / Expertise */}
                <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">🎯 Top Skills</h3>
                    <div className="space-y-2">
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-gray-600 dark:text-gray-400">Bug Fixing</span><span className="font-medium text-gray-800 dark:text-white">85%</span></div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-rose-500" style={{ width: '85%' }} /></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-gray-600 dark:text-gray-400">Task Completion</span><span className="font-medium text-gray-800 dark:text-white">92%</span></div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: '92%' }} /></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1"><span className="text-gray-600 dark:text-gray-400">Early Delivery</span><span className="font-medium text-gray-800 dark:text-white">68%</span></div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-blue-500" style={{ width: '68%' }} /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

