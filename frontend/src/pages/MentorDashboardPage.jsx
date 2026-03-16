import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ComposedChart, Line,
} from 'recharts';
import {
    Users, DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock,
    Wallet, ArrowUpRight, ArrowDownRight, GraduationCap, Phone,
    Target, Trophy, Zap, Star, ChevronRight, Eye, EyeOff,
} from 'lucide-react';

const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];
const USD_TO_AED = 3.674;
const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);
const fmtUSD = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const MASKED = '••••••';
/* ───────── Stat Card ───────── */
function StatCard({ title, value, subtitle, icon: Icon, colorClass = 'bg-blue-500/10 text-blue-500', trend, trendUp }) {
    return (
        <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                        {trend && (
                            <div className={`flex items-center gap-1 mt-1.5 text-xs ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                <span>{trend}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-2.5 rounded-xl ${colorClass}`}><Icon className="h-5 w-5" /></div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ───────── Section Header ───────── */
function SectionLabel({ icon: Icon, title, subtitle, color = 'text-blue-500' }) {
    return (
        <div className="flex items-center gap-2 pt-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ───────── Main Component ───────── */
function MentorDashboardPage() {
    const { user } = useAuth();
    const [indData, setIndData] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [trend, setTrend] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [revenueChart, setRevenueChart] = useState([]);
    const [period, setPeriod] = useState('overall');
    const [loading, setLoading] = useState(true);
    const [showSensitive, setShowSensitive] = useState(false);

    const isMaster = user?.role === 'master_of_academics';
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);
    const canDrillDown = isMaster || isAdmin;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const calls = [
                apiClient.get(`/mentor/dashboard?period=${period}&view_mode=individual`),
                apiClient.get(`/mentor/dashboard/monthly-trend?view_mode=individual`),
                apiClient.get(`/mentor/dashboard/leaderboard?period=${period}`),
                apiClient.get(`/mentor/dashboard/revenue-chart?period=${period}`),
            ];
            // Edwin also fetches team data
            if (isMaster || isAdmin) {
                calls.push(apiClient.get(`/mentor/dashboard?period=${period}&view_mode=team`));
                calls.push(apiClient.get(`/mentor/dashboard/monthly-trend?view_mode=team`));
            }
            const results = await Promise.allSettled(calls);
            const val = (i, fb) => results[i]?.status === 'fulfilled' ? results[i].value.data : fb;
            setIndData(val(0, null));
            setTrend(val(1, []));
            setLeaderboard(val(2, []));
            setRevenueChart(val(3, []));
            if (isMaster || isAdmin) {
                setTeamData(val(4, null));
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [period, isMaster, isAdmin]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading || !indData) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    const d = indData; // individual data shorthand
    const t = teamData; // team data shorthand (null for regular mentors)

    const bonus = d.bonus || {};
    const slabs = bonus.slabs || [];
    const monthNetUSD = bonus.month_net_usd || 0;
    const currentSlab = bonus.current_slab;
    const nextSlab = bonus.next_slab;
    const bonusAED = bonus.bonus_amount_aed || 0;
    const progressPct = nextSlab ? Math.min(100, (monthNetUSD / nextSlab.threshold) * 100) : (currentSlab ? 100 : 0);
    const toNextSlab = nextSlab ? nextSlab.threshold - monthNetUSD : 0;
    const connRate = d.total_students > 0 ? Math.round(d.students_connected / d.total_students * 100) : 0;

    return (
        <div className="space-y-6" data-testid="mentor-dashboard-page">
            {/* ═══════ HEADER ═══════ */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-orange-500" />
                        Mentor Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user?.full_name}! Here's your performance overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge className="bg-orange-500 text-white px-4 py-2 text-sm">
                        {isMaster ? 'Master of Academics' : user?.role?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[140px]" data-testid="period-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* ═══════ MY PERFORMANCE (Individual) ═══════ */}
            <SectionLabel icon={Target} title="My Performance" subtitle="Your individual stats" color="text-orange-500" />

            {/* Student Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Students" value={d.total_students} subtitle="Assigned to you" icon={Users} colorClass="bg-blue-500/10 text-blue-500" />
                <StatCard title="Students Connected" value={d.students_connected} subtitle={`${connRate}% connection rate`} icon={Phone} colorClass="bg-emerald-500/10 text-emerald-500" />
                <StatCard title="Pending Connection" value={d.students_balance} subtitle="Need follow-up" icon={Clock} colorClass="bg-orange-500/10 text-orange-500" />
                <StatCard title="Net Revenue" value={fmtAED(d.net_aed)} subtitle={`${fmtUSD(d.net_usd)} USD`} icon={d.net_aed >= 0 ? TrendingUp : TrendingDown} colorClass={d.net_aed >= 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'} />
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-5 w-5 text-emerald-500" />Revenue Overview</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Deposits</p>
                                <p className="text-2xl font-bold text-emerald-500 font-mono">{fmtAED(d.total_deposits_aed)}</p>
                                <p className="text-xs text-muted-foreground">{fmtUSD(d.total_deposits_usd)} USD</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                                <p className="text-2xl font-bold text-red-500 font-mono">{fmtAED(d.total_withdrawals_aed)}</p>
                                <p className="text-xs text-muted-foreground">{fmtUSD(d.total_withdrawals_usd)} USD</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Net Revenue</p>
                                <p className={`text-2xl font-bold font-mono ${d.net_aed >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{fmtAED(d.net_aed)}</p>
                                <p className="text-xs text-muted-foreground">{fmtUSD(d.net_usd)} USD</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Commission Card */}
                <Card data-testid="commission-card">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5 text-purple-500" />Commission</CardTitle>
                            <button onClick={() => setShowSensitive(!showSensitive)} className="p-1.5 rounded-lg hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground" data-testid="toggle-sensitive-btn" aria-label={showSensitive ? 'Hide sensitive data' : 'Show sensitive data'}>
                                {showSensitive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Flat (1% of deposits)</span>
                            <span className="font-semibold text-emerald-500 font-mono">{showSensitive ? fmtAED(d.flat_commission_aed) : MASKED}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Net (1% of net)</span>
                            <span className={`font-semibold font-mono ${d.net_commission_aed >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{showSensitive ? fmtAED(d.net_commission_aed) : MASKED}</span>
                        </div>
                        {isMaster && (
                            <div className="flex justify-between items-center border-t border-border/50 pt-2">
                                <span className="text-sm text-muted-foreground">Team Override (0.5%)</span>
                                <span className="font-semibold text-blue-500 font-mono">{showSensitive ? fmtAED(d.team_override_aed) : MASKED}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t border-border pt-2">
                            <span className="font-medium">Total</span>
                            <span className="text-lg font-bold font-mono text-primary">{showSensitive ? fmtAED(d.total_commission_aed) : MASKED}</span>
                        </div>
                        {d.net_commission_aed < 0 && (
                            <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">Commission on hold — net is negative. Payout withheld until recovered.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bonus + Student Pipeline row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bonus Slab */}
                <Card data-testid="bonus-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-amber-500" />Bonus Progress</CardTitle>
                        <CardDescription>This month: {fmtUSD(monthNetUSD)} net deposits</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {bonus.salary_aed > 0 && (
                            <div className="flex justify-between items-center text-sm bg-muted/40 rounded-lg px-3 py-2">
                                <span className="text-muted-foreground">Base Salary</span>
                                <span className="font-semibold font-mono">{showSensitive ? fmtAED(bonus.salary_aed) : MASKED}</span>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span>{currentSlab ? `${currentSlab.bonus_pct}% slab achieved` : 'No slab reached yet'}</span>
                                {nextSlab && <span className="text-muted-foreground">{fmtUSD(toNextSlab)} to {nextSlab.bonus_pct}%</span>}
                            </div>
                            <Progress value={progressPct} className="h-2.5 [&>div]:bg-amber-500" />
                        </div>
                        {currentSlab && (
                            <div className="bg-amber-500/10 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Current Bonus</p>
                                    <p className="text-xs text-muted-foreground">{currentSlab.bonus_pct}% of salary</p>
                                </div>
                                <p className="text-xl font-bold text-amber-500 font-mono">{showSensitive ? fmtAED(bonusAED) : MASKED}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-5 gap-1 text-center">
                            {slabs.map((s) => (
                                <div key={s.threshold} className={`p-1.5 rounded text-[10px] ${monthNetUSD >= s.threshold ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/50 text-muted-foreground'}`}>
                                    <p className="font-bold">{s.bonus_pct}%</p>
                                    <p>${(s.threshold/1000).toFixed(0)}k</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Student Pipeline */}
                <Card data-testid="student-pipeline">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5 text-cyan-500" />Student Pipeline</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { stage: 'New Student', key: 'new_student', color: 'bg-blue-500' },
                                { stage: 'Discussion Started', key: 'discussion_started', color: 'bg-purple-500' },
                                { stage: 'Pitched Redeposit', key: 'pitched_for_redeposit', color: 'bg-orange-500' },
                                { stage: 'Interested', key: 'interested', color: 'bg-yellow-500' },
                                { stage: 'Closed (Deposit)', key: 'closed', color: 'bg-emerald-500' },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        <span className="text-sm">{item.stage}</span>
                                    </div>
                                    <Badge variant="secondary">{d.student_stages?.[item.key] || 0}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend (individual) */}
            <Card data-testid="monthly-trend-chart">
                <CardHeader><CardTitle className="text-base">My Monthly Trend</CardTitle><CardDescription>Deposits, withdrawals, and net revenue over time</CardDescription></CardHeader>
                <CardContent>
                    {trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <ComposedChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(v) => fmtAED(v)} />
                                <Legend />
                                <Bar dataKey="deposits_aed" name="Deposits" fill="#10b981" radius={[4,4,0,0]} />
                                <Bar dataKey="withdrawals_aed" name="Withdrawals" fill="#ef4444" radius={[4,4,0,0]} />
                                <Line type="monotone" dataKey="net_aed" name="Net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No monthly data yet</p>
                            <p className="text-xs mt-1">Trend data will appear once deposits are recorded</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══════ TEAM OVERVIEW (Edwin / Admin only) ═══════ */}
            {canDrillDown && (
                <>
                    <SectionLabel icon={Users} title="Team Overview" subtitle={`All mentors${t ? ` — ${t.total_students} students` : ''}`} color="text-blue-500" />

                    {/* Team Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="team-revenue-cards">
                        <StatCard title="Team Deposits" value={fmtAED(t?.total_deposits_aed)} subtitle={`${fmtUSD(t?.total_deposits_usd)} USD`} icon={ArrowUpRight} colorClass="bg-emerald-500/10 text-emerald-500" />
                        <StatCard title="Team Withdrawals" value={fmtAED(t?.total_withdrawals_aed)} subtitle={`${fmtUSD(t?.total_withdrawals_usd)} USD`} icon={TrendingDown} colorClass="bg-red-500/10 text-red-500" />
                        <StatCard title="Team Net" value={fmtAED(t?.net_aed)} subtitle={`${fmtUSD(t?.net_usd)} USD`} icon={(t?.net_aed || 0) >= 0 ? TrendingUp : TrendingDown} colorClass={(t?.net_aed || 0) >= 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'} />
                    </div>

                    {/* Revenue Chart + Leaderboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card data-testid="mentor-revenue-chart">
                            <CardHeader><CardTitle className="text-base">Mentor-wise Revenue</CardTitle>
                                <CardDescription>{revenueChart.length > 0 ? 'Click a bar for details' : 'Revenue comparison will appear with data'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {revenueChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={revenueChart} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="mentor_name" width={100} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(v) => fmtAED(v)} />
                                            <Bar dataKey="deposits_aed" name="Deposits (AED)" fill="#f59e0b" radius={[0,4,4,0]} cursor="pointer" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Zap className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No mentor revenue data yet</p>
                                        <p className="text-xs mt-1">Chart populates when deposits are recorded</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card data-testid="mentor-leaderboard">
                            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-amber-500" />Leaderboard</CardTitle><CardDescription>Ranked by net revenue</CardDescription></CardHeader>
                            <CardContent>
                                {leaderboard.length > 0 ? (
                                    <div className="space-y-2.5">
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
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Trophy className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No leaderboard data yet</p>
                                        <p className="text-xs mt-1">Rankings appear when mentors record deposits</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Leaderboard for regular mentors */}
            {!canDrillDown && (
                <Card data-testid="mentor-leaderboard">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-amber-500" />Leaderboard</CardTitle><CardDescription>Ranked by net revenue</CardDescription></CardHeader>
                    <CardContent>
                        {leaderboard.length > 0 ? (
                            <div className="space-y-2.5">
                                {leaderboard.map((m, idx) => (
                                    <div key={m.mentor_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50" data-testid={`leaderboard-row-${idx}`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500/20 text-amber-500' : idx === 1 ? 'bg-gray-400/20 text-gray-400' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</div>
                                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.mentor_name}</p><p className="text-xs text-muted-foreground">{m.deposit_count} deposits</p></div>
                                        <div className="text-right"><p className="text-sm font-bold font-mono text-emerald-500">{fmtAED(m.net_aed)}</p></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Trophy className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No leaderboard data yet</p>
                                <p className="text-xs mt-1">Rankings appear when mentors record deposits</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default MentorDashboardPage;
