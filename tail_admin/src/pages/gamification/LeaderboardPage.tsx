import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Medal, Award, Zap } from 'lucide-react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

interface RankingEntry {
    rank: number;
    member_id: string;
    name: string;
    period_credits: number;
    total_credits: number;
    level: string;
}

interface LeaderboardData {
    period: string;
    rankings: RankingEntry[];
}

const getRankIcon = (rank: number) => {
    switch(rank) {
        case 1: return <Trophy className="h-4 w-4 text-yellow-500" />;
        case 2: return <Medal className="h-4 w-4 text-gray-400" />;
        case 3: return <Award className="h-4 w-4 text-amber-600" />;
        default: return <span className="text-xs font-bold text-gray-400">#{rank}</span>;
    }
};

const LeaderboardPage: React.FC = () => {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`http://192.168.1.26:8000/api/gamification/leaderboard/?period=${period}&limit=10`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to load leaderboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [period]);

    const periodLabels = {
        'weekly': 'Week',
        'monthly': 'Month',
        'all-time': 'All Time'
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Leaderboard" />
            <div className="space-y-4">
                {/* Compact Header with Tabs */}
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-400" />
                        <div>
                            <h1 className="text-xl font-bold">Leaderboard</h1>
                            <p className="text-sm text-white/80">Top contributors</p>
                        </div>
                    </div>
                    {/* Period Tabs - Inline */}
                    <div className="flex gap-1 rounded-lg bg-white/20 p-1">
                        {(['weekly', 'monthly', 'all-time'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                    period === p 
                                        ? 'bg-white text-indigo-600' 
                                        : 'text-white/80 hover:bg-white/10'
                                }`}
                            >
                                {periodLabels[p]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rankings Table */}
                {loading ? (
                    <div className="flex h-32 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : data?.rankings.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No activity this period</div>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                            <div className="col-span-1">#</div>
                            <div className="col-span-5">Member</div>
                            <div className="col-span-3 text-center">Level</div>
                            <div className="col-span-3 text-right">Credits</div>
                        </div>
                        
                        {/* Table Rows */}
                        {data?.rankings.map((entry, idx) => (
                            <div 
                                key={entry.member_id}
                                className={`grid grid-cols-12 items-center gap-2 px-4 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    idx !== (data?.rankings.length || 0) - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                                } ${entry.rank <= 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10' : ''}`}
                            >
                                {/* Rank */}
                                <div className="col-span-1 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    {getRankIcon(entry.rank)}
                                </div>
                                
                                {/* Name */}
                                <div className="col-span-5">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{entry.name}</p>
                                    <p className="text-xs text-gray-500">{entry.total_credits} total</p>
                                </div>
                                
                                {/* Level */}
                                <div className="col-span-3 text-center">
                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                        {entry.level}
                                    </span>
                                </div>
                                
                                {/* Period Credits */}
                                <div className="col-span-3 text-right">
                                    <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                                        +{entry.period_credits}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default LeaderboardPage;

