import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, PhoneCall, Clock, TrendingUp, Users, Target } from 'lucide-react';

function formatMins(mins) {
    if (!mins || mins === 0) return '0m';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function CallAnalyticsWidget({ compact = false }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/3cx/call-analytics')
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-xs text-muted-foreground p-2">Loading call stats...</div>;
    if (!data) return null;

    const { my_stats, leaderboard, top_dialed, is_manager } = data;

    if (compact) {
        return (
            <div className="flex items-center gap-4 text-xs" data-testid="call-stats-compact">
                <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-green-500" />
                    <span className="font-mono font-semibold">{formatMins(my_stats.today_minutes)}</span>
                    <span className="text-muted-foreground">today</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="font-mono font-semibold">{formatMins(my_stats.month_minutes)}</span>
                    <span className="text-muted-foreground">this month</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <PhoneCall className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{my_stats.today_calls}</span>
                    <span className="text-muted-foreground">calls today</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3" data-testid="call-analytics-widget">
            {/* My Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card>
                    <CardContent className="p-3 text-center">
                        <Phone className="h-4 w-4 mx-auto mb-1 text-green-500" />
                        <p className="text-lg font-bold font-mono">{formatMins(my_stats.today_minutes)}</p>
                        <p className="text-[10px] text-muted-foreground">Talk Time Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <PhoneCall className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                        <p className="text-lg font-bold font-mono">{my_stats.today_calls}</p>
                        <p className="text-[10px] text-muted-foreground">Calls Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-lg font-bold font-mono">{formatMins(my_stats.month_minutes)}</p>
                        <p className="text-[10px] text-muted-foreground">Talk Time This Month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                        <p className="text-lg font-bold font-mono">{my_stats.month_calls}</p>
                        <p className="text-[10px] text-muted-foreground">Calls This Month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Manager/CEO: Team Leaderboard */}
            {is_manager && leaderboard.length > 0 && (
                <Card>
                    <CardContent className="p-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                            <Users className="h-3.5 w-3.5 text-blue-500" /> Team Call Leaderboard
                        </h4>
                        <ScrollArea className="max-h-[200px]">
                            <div className="space-y-1">
                                {leaderboard.map((agent, i) => (
                                    <div key={agent.user_id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50" data-testid={`leaderboard-row-${i}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                {i + 1}
                                            </span>
                                            <span className="font-medium">{agent.user_name}</span>
                                            <Badge variant="outline" className="text-[8px] capitalize">{agent.role?.replace(/_/g, ' ')}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <span className="font-mono">{formatMins(agent.today_minutes)} <span className="text-[9px]">today</span></span>
                                            <span className="font-mono font-semibold text-foreground">{formatMins(agent.month_minutes)} <span className="text-[9px] text-muted-foreground">month</span></span>
                                            <span className="text-[9px]">{agent.month_calls} calls</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Manager/CEO: Most Dialed Numbers */}
            {is_manager && top_dialed.length > 0 && (
                <Card>
                    <CardContent className="p-3">
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                            <Target className="h-3.5 w-3.5 text-rose-500" /> Most Dialed Numbers
                        </h4>
                        <ScrollArea className="max-h-[180px]">
                            <div className="space-y-1">
                                {top_dialed.map((entry, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50" data-testid={`top-dialed-${i}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-muted-foreground">{entry.phone_number}</span>
                                            {entry.contact_name && (
                                                <span className="font-medium text-foreground">{entry.contact_name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-[9px] bg-rose-500">{entry.dial_count}x dialed</Badge>
                                            {entry.unique_callers > 1 && (
                                                <span className="text-[9px] text-muted-foreground">{entry.unique_callers} agents</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
