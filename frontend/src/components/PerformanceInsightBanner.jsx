import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { TrendingUp, TrendingDown, Trophy, Users, Zap, Star } from 'lucide-react';

const fmtCur = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

export const PerformanceInsightBanner = ({ endpoint = '/dashboard/performance-insight' }) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        apiClient.get(endpoint).then(r => setData(r.data)).catch(() => {});
    }, [endpoint]);

    if (!data) return null;

    const firstName = (data.name || 'there').split(' ')[0];

    if (data.type === 'agent') {
        const isUp = (data.delta_pct || 0) >= 0;
        const deals = data.your_deals || data.your_upgrades || 0;
        const avgDeals = data.team_avg_deals || data.team_avg_upgrades || 0;
        const dealWord = data.your_upgrades !== undefined ? 'upgrade' : 'deal';
        const Icon = isUp ? TrendingUp : TrendingDown;
        const rankSuffix = data.rank === 1 ? 'st' : data.rank === 2 ? 'nd' : data.rank === 3 ? 'rd' : 'th';
        const hasActivity = deals > 0;

        return (
            <div data-testid="performance-insight-banner" className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-muted/80 via-muted/40 to-transparent p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isUp ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                            <Icon className={`h-5 w-5 ${isUp ? 'text-emerald-500' : 'text-amber-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {hasActivity ? (
                                    <>Hey {firstName}, you closed <span className="font-bold text-foreground">{deals}</span> {dealWord}{deals !== 1 ? 's' : ''} worth <span className="font-bold text-emerald-500">{fmtCur(data.your_revenue)}</span> in {data.month}</>
                                ) : (
                                    <>Hey {firstName}, no {dealWord}s closed yet in {data.month} — let's get going!</>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Team avg: {avgDeals} {dealWord}s / {fmtCur(data.team_avg_revenue)}
                                {hasActivity && data.delta_pct !== 0 && (
                                    <span className={`ml-2 font-semibold ${isUp ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        ({isUp ? '+' : ''}{data.delta_pct}% vs avg)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    {data.rank > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            {data.rank <= 3 ? (
                                <Trophy className={`h-5 w-5 ${data.rank === 1 ? 'text-amber-400' : data.rank === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                            ) : (
                                <Star className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-right">
                                <p className="text-lg font-bold leading-none">{data.rank}<sup className="text-xs font-normal">{rankSuffix}</sup></p>
                                <p className="text-[10px] text-muted-foreground">of {data.total_agents}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (data.type === 'leader') {
        return (
            <div data-testid="performance-insight-banner" className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-muted/80 via-muted/40 to-transparent p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/15">
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {firstName}, {data.team_name || 'your team'} closed <span className="font-bold text-foreground">{data.team_deals}</span> deal{data.team_deals !== 1 ? 's' : ''} worth <span className="font-bold text-emerald-500">{fmtCur(data.team_revenue)}</span> in {data.month}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {data.team_agent_count} active agent{data.team_agent_count !== 1 ? 's' : ''} · Company total: {data.company_deals} deals / {fmtCur(data.company_revenue)}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // admin view
    const adminDealWord = data.total_upgrades !== undefined ? 'upgrade' : 'deal';
    return (
        <div data-testid="performance-insight-banner" className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-r from-muted/80 via-muted/40 to-transparent p-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/15">
                    <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-medium">
                        {data.month}: <span className="font-bold text-foreground">{data.total_deals || data.total_upgrades || 0}</span> {adminDealWord}s closed by <span className="font-bold">{data.active_agents}</span> agents totalling <span className="font-bold text-emerald-500">{fmtCur(data.total_revenue)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Avg per agent: {data.avg_deals || data.avg_upgrades || 0} {adminDealWord}s / {fmtCur(data.avg_revenue)}
                    </p>
                </div>
            </div>
        </div>
    );
};
