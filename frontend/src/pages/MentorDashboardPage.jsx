import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ComposedChart, Area,
} from 'recharts';
import {
    Users, DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
    GraduationCap, Target, Filter, ChevronRight, Trophy, Zap, Star,
} from 'lucide-react';

const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];
const USD_TO_AED = 3.674;
const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);
const fmtUSD = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0);

function StatCard({ title, value, subtitle, icon: Icon, colorClass = 'bg-blue-500/10 text-blue-500' }) {
    return (
        <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    <div className={`p-2.5 rounded-xl ${colorClass}`}><Icon className="h-5 w-5" /></div>
                </div>
            </CardContent>
        </Card>
    );
}

function MentorDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [trend, setTrend] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [revenueChart, setRevenueChart] = useState([]);
    const [period, setPeriod] = useState('overall');
    const [viewMode, setViewMode] = useState('team');
    const [loading, setLoading] = useState(true);

    const isMaster = user?.role === 'master_of_academics';
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);
    const canToggleView = isMaster || isAdmin;
    const canDrillDown = isMaster || isAdmin;

    const effectiveView = canToggleView ? viewMode : 'individual';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                apiClient.get(`/mentor/dashboard?period=${period}&view_mode=${effectiveView}`),
                apiClient.get(`/mentor/dashboard/monthly-trend?view_mode=${effectiveView}`),
                apiClient.get(`/mentor/dashboard/leaderboard?period=${period}`),
                apiClient.get(`/mentor/dashboard/revenue-chart?period=${period}`),
            ]);
            const val = (i, fb) => results[i].status === 'fulfilled' ? results[i].value.data : fb;
            setData(val(0, null));
            setTrend(val(1, []));
            setLeaderboard(val(2, []));
            setRevenueChart(val(3, []));
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [period, effectiveView]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading || !data) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    const bonus = data.bonus || {};
    const slabs = bonus.slabs || [];
    const monthNetUSD = bonus.month_net_usd || 0;
    const currentSlab = bonus.current_slab;
    const nextSlab = bonus.next_slab;
    const bonusAED = bonus.bonus_amount_aed || 0;
    const progressPct = nextSlab ? Math.min(100, (monthNetUSD / nextSlab.threshold) * 100) : 100;
    const toNextSlab = nextSlab ? nextSlab.threshold - monthNetUSD : 0;

    const netNegative = data.net_aed < 0;

    return (
        <div className="space-y-6" data-testid="mentor-dashboard-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-orange-500" />
                        Mentor Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        {isMaster ? 'Team overview — click charts to drill down' : `Welcome back, ${user?.full_name?.split(' ')[0]}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canToggleView && (
                        <Tabs value={viewMode} onValueChange={setViewMode} data-testid="view-toggle">
                            <TabsList><TabsTrigger value="individual">Individual</TabsTrigger><TabsTrigger value="team">Team</TabsTrigger></TabsList>
                        </Tabs>
                    )}
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[140px]" data-testid="period-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* Deposits / Withdrawals / Net */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="revenue-cards">
                <StatCard title="Total Deposits" value={fmtAED(data.total_deposits_aed)} subtitle={`${fmtUSD(data.total_deposits_usd)} USD`} icon={ArrowUpRight} colorClass="bg-emerald-500/10 text-emerald-500" />
                <StatCard title="Total Withdrawals" value={fmtAED(data.total_withdrawals_aed)} subtitle={`${fmtUSD(data.total_withdrawals_usd)} USD`} icon={TrendingDown} colorClass="bg-red-500/10 text-red-500" />
                <StatCard title="Net Revenue" value={fmtAED(data.net_aed)} subtitle={netNegative ? 'Withdrawals exceed deposits' : `${fmtUSD(data.net_usd)} USD`} icon={netNegative ? TrendingDown : TrendingUp} colorClass={netNegative ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'} />
            </div>

            {/* Commission + Bonus row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Commission Card */}
                <Card data-testid="commission-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5 text-purple-500" />Commission Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Flat Commission (1% of deposits)</span>
                            <span className="font-semibold text-emerald-500 font-mono">{fmtAED(data.flat_commission_aed)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Net Commission ({isMaster ? '1.5%' : '1%'} of net)</span>
                            <span className={`font-semibold font-mono ${data.net_commission_aed >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtAED(data.net_commission_aed)}</span>
                        </div>
                        {isMaster && (
                            <div className="flex justify-between items-center border-t border-border/50 pt-2">
                                <span className="text-sm text-muted-foreground">Team Override (0.5% team net)</span>
                                <span className="font-semibold text-blue-500 font-mono">{fmtAED(data.team_override_aed)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t border-border pt-3">
                            <span className="font-medium">Total Commission</span>
                            <span className="text-lg font-bold font-mono text-primary">{fmtAED(data.total_commission_aed)}</span>
                        </div>
                        {data.net_commission_aed < 0 && (
                            <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">Commission hold: Net is negative. Next payout will be withheld until the deficit is recovered.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Bonus Slab Card */}
                <Card data-testid="bonus-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-amber-500" />Bonus Progress</CardTitle>
                        <CardDescription>This month: {fmtUSD(monthNetUSD)} net deposits</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Slab progress bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span>{currentSlab ? `${currentSlab.bonus_pct}% slab achieved` : 'No slab reached'}</span>
                                {nextSlab && <span className="text-muted-foreground">{fmtUSD(toNextSlab)} to {nextSlab.bonus_pct}%</span>}
                            </div>
                            <Progress value={progressPct} className="h-2.5 [&>div]:bg-amber-500" />
                        </div>
                        {currentSlab && (
                            <div className="bg-amber-500/10 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Current Bonus</p>
                                    <p className="text-xs text-muted-foreground">{currentSlab.bonus_pct}% of AED {bonus.salary_aed} salary</p>
                                </div>
                                <p className="text-xl font-bold text-amber-500 font-mono">{fmtAED(bonusAED)}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-5 gap-1 text-center">
                            {slabs.map((s) => {
                                const reached = monthNetUSD >= s.threshold;
                                return (
                                    <div key={s.threshold} className={`p-1.5 rounded text-[10px] ${reached ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/50 text-muted-foreground'}`}>
                                        <p className="font-bold">{s.bonus_pct}%</p>
                                        <p>{fmtUSD(s.threshold).replace('$', '').replace(',', 'k').slice(0, -4)}k</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Student Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Students" value={data.total_students} subtitle="Assigned" icon={Users} colorClass="bg-blue-500/10 text-blue-500" />
                <StatCard title="Connected" value={data.students_connected} subtitle={`${data.total_students > 0 ? Math.round(data.students_connected / data.total_students * 100) : 0}% connection rate`} icon={Target} colorClass="bg-emerald-500/10 text-emerald-500" />
                <StatCard title="Pending" value={data.students_balance} subtitle="Need follow-up" icon={Zap} colorClass="bg-orange-500/10 text-orange-500" />
            </div>

            {/* Monthly Trend */}
            {trend.length > 0 && (
                <Card data-testid="monthly-trend-chart">
                    <CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle><CardDescription>Deposits, withdrawals, and net revenue</CardDescription></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    formatter={(v) => fmtAED(v)} />
                                <Legend />
                                <Bar dataKey="deposits_aed" name="Deposits" fill="#10b981" radius={[4,4,0,0]} />
                                <Bar dataKey="withdrawals_aed" name="Withdrawals" fill="#ef4444" radius={[4,4,0,0]} />
                                <Line type="monotone" dataKey="net_aed" name="Net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Revenue Chart + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue by Mentor */}
                {revenueChart.length > 0 && (
                    <Card data-testid="mentor-revenue-chart">
                        <CardHeader><CardTitle className="text-base">Mentor-wise Revenue</CardTitle>
                            {canDrillDown && <CardDescription>Click a bar for details</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={revenueChart} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="mentor_name" width={100} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                        formatter={(v) => fmtAED(v)} />
                                    <Bar dataKey="deposits_aed" name="Deposits (AED)" fill="#f59e0b" radius={[0,4,4,0]} cursor={canDrillDown ? 'pointer' : 'default'} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Leaderboard */}
                {leaderboard.length > 0 && (
                    <Card data-testid="mentor-leaderboard">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-amber-500" />Leaderboard</CardTitle>
                            <CardDescription>Ranked by net revenue</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {leaderboard.map((m, idx) => (
                                <div key={m.mentor_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors" data-testid={`leaderboard-row-${idx}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500/20 text-amber-500' : idx === 1 ? 'bg-gray-400/20 text-gray-400' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{m.mentor_name}</p>
                                        <p className="text-xs text-muted-foreground">{m.deposit_count} deposits</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold font-mono text-emerald-500">{fmtAED(m.net_aed)}</p>
                                        <p className="text-[10px] text-muted-foreground">net</p>
                                    </div>
                                    {canDrillDown && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default MentorDashboardPage;
