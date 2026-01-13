import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Gift, Zap, Check, Lock } from 'lucide-react';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

interface Reward {
    reward_id: string;
    name: string;
    description: string;
    icon: string;
    cost_credits: number;
    effect_type: string;
    effect_value: string;
    owned: boolean;
    can_afford: boolean;
}

const RewardsPage: React.FC = () => {
    const currentMemberId = "1f0bb929-e50c-4e99-a5c0-f2a480d8f8af";
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [userCredits, setUserCredits] = useState(0);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);

    const fetchRewards = async () => {
        try {
            const res = await axios.get(`http://192.168.1.26:8000/api/gamification/rewards/?member_id=${currentMemberId}`);
            setRewards(res.data.rewards);
            setUserCredits(res.data.user_credits);
        } catch (err) {
            console.error("Failed to load rewards", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const redeemReward = async (rewardId: string) => {
        setRedeeming(rewardId);
        try {
            await axios.post('http://192.168.1.26:8000/api/gamification/rewards/', {
                member_id: currentMemberId,
                reward_id: rewardId
            });
            fetchRewards();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to redeem");
        } finally {
            setRedeeming(null);
        }
    };

    return (
        <>
            <PageBreadcrumb pageTitle="Rewards" />
            <div className="space-y-4">
                {/* Compact Header */}
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <Gift className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold">Rewards Store</h1>
                            <p className="text-sm text-white/80">Trade Credits for rewards</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2">
                        <Zap className="h-5 w-5 text-yellow-300" />
                        <span className="text-2xl font-bold">{userCredits}</span>
                    </div>
                </div>

                {/* Rewards Grid - 4 columns */}
                {loading ? (
                    <div className="flex h-32 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent"></div>
                    </div>
                ) : rewards.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No rewards available</div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {rewards.map((r) => (
                            <div 
                                key={r.reward_id}
                                className={`relative rounded-lg border p-3 text-center transition-all hover:shadow-md ${
                                    r.owned 
                                        ? 'border-green-300 bg-green-50' 
                                        : r.can_afford 
                                            ? 'border-gray-200 bg-white' 
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                } dark:border-gray-700 dark:bg-gray-800`}
                            >
                                {r.owned && (
                                    <div className="absolute top-2 right-2 rounded-full bg-green-500 p-0.5 text-white">
                                        <Check className="h-3 w-3" />
                                    </div>
                                )}
                                
                                <span className="text-3xl">{r.icon}</span>
                                <h3 className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{r.name}</h3>
                                <p className="mt-0.5 truncate text-xs text-gray-500">{r.description}</p>
                                
                                <div className="mt-2 flex items-center justify-center gap-1 text-sm font-bold text-amber-600">
                                    <Zap className="h-3.5 w-3.5" />
                                    {r.cost_credits}
                                </div>
                                
                                {r.owned ? (
                                    <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                        ✓ Owned
                                    </span>
                                ) : r.can_afford ? (
                                    <button
                                        onClick={() => redeemReward(r.reward_id)}
                                        disabled={redeeming === r.reward_id}
                                        className="mt-2 w-full rounded bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-medium text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                                    >
                                        {redeeming === r.reward_id ? '...' : 'Redeem'}
                                    </button>
                                ) : (
                                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                                        <Lock className="h-3 w-3" />
                                        +{r.cost_credits - userCredits}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default RewardsPage;

