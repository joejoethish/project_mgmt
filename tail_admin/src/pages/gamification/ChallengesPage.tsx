import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Target, Clock, Zap, CheckCircle } from 'lucide-react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

interface Challenge {
    challenge_id: string;
    name: string;
    description: string;
    icon: string;
    challenge_type: string;
    activity_type: string;
    target_count: number;
    reward_credits: number;
    end_date: string;
    joined: boolean;
    progress: number;
    completed: boolean;
}

const ChallengesPage: React.FC = () => {
    const currentMemberId = "1f0bb929-e50c-4e99-a5c0-f2a480d8f8af";
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChallenges = async () => {
        try {
            const res = await axios.get(`http://192.168.1.26:8000/api/gamification/challenges/?member_id=${currentMemberId}`);
            setChallenges(res.data.challenges);
        } catch (err) {
            console.error("Failed to load challenges", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChallenges();
    }, []);

    const joinChallenge = async (challengeId: string) => {
        try {
            await axios.post('http://192.168.1.26:8000/api/gamification/challenges/', {
                member_id: currentMemberId,
                challenge_id: challengeId
            });
            fetchChallenges();
        } catch (err) {
            console.error("Failed to join challenge", err);
        }
    };

    const getTimeRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    const getTypeStyle = (type: string) => {
        switch(type) {
            case 'daily': return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' };
            case 'weekly': return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' };
            case 'sprint': return { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' };
            default: return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Challenges" />
            <div className="space-y-4">
                {/* Compact Header */}
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <Target className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold">Active Challenges</h1>
                            <p className="text-sm text-white/80">Complete to earn bonus Credits</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold">{challenges.length}</span>
                        <p className="text-xs text-white/80">Available</p>
                    </div>
                </div>

                {/* Challenges Grid - 3 columns on large screens */}
                {loading ? (
                    <div className="flex h-32 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent"></div>
                    </div>
                ) : challenges.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No active challenges</div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {challenges.map((c) => {
                            const style = getTypeStyle(c.challenge_type);
                            const progressPercent = Math.min(100, (c.progress / c.target_count) * 100);
                            
                            return (
                                <div 
                                    key={c.challenge_id}
                                    className={`relative rounded-lg border p-3 transition-all hover:shadow-md ${
                                        c.completed ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                                    } dark:border-gray-700 dark:bg-gray-800`}
                                >
                                    {/* Type Badge - Top Right */}
                                    <span className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white ${style.bg}`}>
                                        {c.challenge_type}
                                    </span>
                                    
                                    {/* Icon + Title Row */}
                                    <div className="flex items-center gap-2 pr-14">
                                        <span className="text-2xl">{c.icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                                            <p className="truncate text-xs text-gray-500">{c.description}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Compact Progress Row */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                                            <div 
                                                className={`h-full transition-all ${c.completed ? 'bg-green-500' : style.bg}`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">{c.progress}/{c.target_count}</span>
                                    </div>
                                    
                                    {/* Footer - Time + Action */}
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="h-3 w-3" />
                                            {getTimeRemaining(c.end_date)}
                                        </div>
                                        
                                        {c.completed ? (
                                            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Done
                                            </span>
                                        ) : c.joined ? (
                                            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                                                <Zap className="h-3 w-3" />
                                                +{c.reward_credits}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => joinChallenge(c.challenge_id)}
                                                className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-indigo-700"
                                            >
                                                Join
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};

export default ChallengesPage;

