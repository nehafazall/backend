import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipelineRevenueWidget } from '@/components/PipelineRevenueWidget';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import {
    DollarSign, TrendingUp, Users, Target, Award, Eye, Filter,
    BarChart3, PieChart as PieChartIcon, Layers, ChevronRight,
} from 'lucide-react';
import { PerformanceInsightBanner } from '@/components/PerformanceInsightBanner';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' }, { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' }, { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' }, { value: 'custom', label: 'Custom Range' },
];

const SalesDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isManagerOrAbove = ['sales_manager', 'team_leader', 'admin', 'super_admin'].includes(user?.role);
    const isTeamLeader = user?.role === 'team_leader';
    const canDrillDown = isManagerOrAbove;
    const [period, setPeriod] = useState('overall');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [filteredStats, setFilteredStats] = useState({});
    const [leadFunnel, setLeadFunnel] = useState([]);
    const [salesByCourse, setSalesByCourse] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [topAgentsOverall, setTopAgentsOverall] = useState([]);
    const [teamRevenue, setTeamRevenue] = useState([]);
    const [monthComparison, setMonthComparison] = useState(null);
    const [todayTxns, setTodayTxns] = useState({ count: 0, total_amount: 0, transactions: [] });
    const [loading, setLoading] = useState(true);
    const [drill, setDrill] = useState({ open: false, title: '', content: null, loading: false, breadcrumbs: [] });

    const periodQuery = useCallback(() => {
        let q = `period=${period}`;
        if (period === 'custom' && customStart) q += `&custom_start=${customStart}`;
        if (period === 'custom' && customEnd) q += `&custom_end=${customEnd}`;
        return q;
    }, [period, customStart, customEnd]);

    useEffect(() => { fetchAllData(); }, []);
    useEffect(() => { fetchFilteredData(); }, [period, customStart, customEnd]);

    const fetchAllData = async () => {
        setLoading(true);
        const vm = isManagerOrAbove ? 'team' : 'individual';
        try {
            const results = await Promise.allSettled([
                apiClient.get('/dashboard/lead-funnel'),
                apiClient.get('/dashboard/sales-by-course'),
                apiClient.get(`/dashboard/monthly-trend?view_mode=${vm}`),
                apiClient.get(`/dashboard/today-transactions?view_mode=${vm}`),
                apiClient.get(`/dashboard/month-comparison?view_mode=${vm}`),
            ]);
            const val = (i, fb) => results[i].status === 'fulfilled' ? results[i].value.data : fb;
            const funnelData = val(0, []);
            setLeadFunnel(Array.isArray(funnelData) ? funnelData.map(item => ({ name: fmtStage(item._id), value: item.count, stage: item._id })) : []);
            const courseData = val(1, []);
            const rawCourses = Array.isArray(courseData) ? courseData.map(item => ({ name: item.course_name || 'Unknown', sales: item.count, revenue: item.revenue || 0 })).sort((a, b) => b.revenue - a.revenue) : [];
            const top8 = rawCourses.slice(0, 8);
            const others = rawCourses.slice(8);
            if (others.length > 0) top8.push({ name: `Others (${others.length})`, sales: others.reduce((s, c) => s + c.sales, 0), revenue: others.reduce((s, c) => s + c.revenue, 0) });
            setSalesByCourse(top8.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] })));
            const trendData = val(2, []);
            setMonthlyTrend(Array.isArray(trendData) ? trendData.map(item => ({ month: item._id, deals: item.deals, revenue: item.revenue })) : []);
            setTodayTxns(val(3, { count: 0, total_amount: 0, transactions: [] }));
            setMonthComparison(val(4, null));
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchFilteredData = async () => {
        try {
            const pq = periodQuery();
            const vm = isManagerOrAbove ? 'team' : 'individual';
            const results = await Promise.allSettled([
                apiClient.get(`/dashboard/filtered-stats?${pq}&view_mode=${vm}`),
                apiClient.get(`/dashboard/sales-agent-closings?${pq}&limit=10`),
                apiClient.get('/dashboard/leaderboard'),
                apiClient.get(`/dashboard/team-revenue?${pq}`),
            ]);
            const val = (i, fb) => results[i].status === 'fulfilled' ? results[i].value.data : fb;
            setFilteredStats(val(0, {}) || {});
            setTopAgentsOverall(val(1, []) || []);
            setLeaderboard(val(2, []) || []);
            setTeamRevenue(val(3, []) || []);
        } catch (err) { console.error(err); }
    };

    const fmtStage = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
    const fmtCur = (a) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(a || 0);

    const closeDrill = () => setDrill({ open: false, title: '', content: null, loading: false, breadcrumbs: [] });
    const openDrillLoading = (title, breadcrumbs = []) => setDrill({ open: true, title, content: null, loading: true, breadcrumbs });

    // ====== DRILL-DOWN: TOP 10 AGENTS ======
    const drillAgent = async (agentName, breadcrumbs = [{ label: 'Top 10 Agents' }]) => {
        openDrillLoading(`${agentName} — Closed Students`, breadcrumbs);
        try {
            const pq = periodQuery();
            const res = await apiClient.get(`/dashboard/drill/agent-students?agent_name=${encodeURIComponent(agentName)}&${pq}`);
            const students = res.data || [];
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-3">
                        <Badge variant="secondary">{students.length} enrolled students</Badge>
                        <Table>
                            <TableHeader><TableRow><TableHead>Student Name</TableHead><TableHead>Course</TableHead><TableHead>Team</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Enrolled</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {students.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No students found for this period</TableCell></TableRow>}
                                {students.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{s.course}</TableCell>
                                        <TableCell className="text-muted-foreground">{s.team_name || '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{fmtCur(s.enrollment_amount)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{typeof s.enrolled_at === 'string' ? s.enrolled_at.substring(0, 10) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-muted-foreground text-center py-4">Failed to load data</p> })); }
    };

    // ====== DRILL-DOWN: TEAM REVENUE → AGENTS ======
    const drillTeam = async (teamName) => {
        openDrillLoading(`${teamName} — Agent Revenue`, [{ label: 'Team Revenue' }]);
        try {
            const pq = periodQuery();
            const res = await apiClient.get(`/dashboard/drill/team-agents?team_name=${encodeURIComponent(teamName)}&${pq}`);
            const agents = res.data || [];
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-3">
                        <Badge variant="secondary">{agents.length} agents</Badge>
                        <Table>
                            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {agents.map((a, i) => (
                                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => drillAgent(a.agent_name, [{ label: 'Team Revenue' }, { label: teamName }])}>
                                        <TableCell className="font-bold">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{a.agent_name}</TableCell>
                                        <TableCell className="text-right">{a.deals}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{fmtCur(a.revenue)}</TableCell>
                                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-muted-foreground text-center py-4">Failed to load</p> })); }
    };

    // ====== DRILL-DOWN: LEAD PIPELINE STAGE ======
    const drillPipeline = async (stageName, stageKey) => {
        openDrillLoading(`${stageName} — Lead Details`, [{ label: 'Lead Pipeline' }]);
        try {
            const pq = periodQuery();
            const res = await apiClient.get(`/dashboard/drill/pipeline-stage?stage=${stageKey}&${pq}`);
            const d = res.data || {};
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-4">
                        <Badge variant="outline" className="text-lg px-3 py-1">{d.total} leads</Badge>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Agent-wise Breakdown</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {(d.agent_breakdown || []).map((a, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70"
                                        onClick={() => drillAgent(a.agent_name, [{ label: 'Lead Pipeline' }, { label: stageName }])}>
                                        <span className="text-sm font-medium truncate">{a.agent_name}</span>
                                        <div className="flex items-center gap-1"><Badge variant="secondary">{a.count}</Badge><ChevronRight className="h-3 w-3 text-muted-foreground" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Leads ({Math.min((d.leads || []).length, 50)} shown)</h4>
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Agent</TableHead><TableHead>Team</TableHead><TableHead>Course</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                                <TableBody>{(d.leads || []).slice(0, 50).map((l, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{l.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{l.agent}</TableCell>
                                        <TableCell className="text-muted-foreground">{l.team || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{l.course}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{typeof l.created_at === 'string' ? l.created_at.substring(0, 10) : '-'}</TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                        </div>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-muted-foreground text-center py-4">Failed to load</p> })); }
    };

    // ====== DRILL-DOWN: MONTHLY REVENUE ======
    const drillMonth = async (monthLabel) => {
        if (!monthLabel) return;
        openDrillLoading(`${monthLabel} — Revenue Breakdown`, [{ label: 'Monthly Trend' }]);
        try {
            const shortMonth = monthLabel.substring(0, 3);
            const res = await apiClient.get(`/dashboard/monthly-revenue/${shortMonth}/details`);
            const d = res.data || {};
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-base px-3 py-1">{fmtCur(d.total_revenue)}</Badge>
                            <Badge variant="secondary">{d.total_enrolled} deals</Badge>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">By Course</h4>
                            <Table>
                                <TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>{(d.by_course || []).map((c, i) => (
                                    <TableRow key={i}><TableCell className="font-medium">{c.course}</TableCell><TableCell className="text-right">{c.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{fmtCur(c.revenue)}</TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">By Agent</h4>
                            <Table>
                                <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>{(d.by_agent || []).map((a, i) => (
                                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => drillAgent(a.agent, [{ label: 'Monthly Trend' }, { label: monthLabel }])}>
                                        <TableCell className="font-medium">{a.agent}</TableCell><TableCell className="text-right">{a.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{fmtCur(a.revenue)}</TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                        </div>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-muted-foreground text-center py-4">Failed to load</p> })); }
    };

    if (loading) return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    const stats = filteredStats;

    return (
        <div className="space-y-6" data-testid="sales-dashboard">
            {/* Header + Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
                    <p className="text-muted-foreground">Performance analytics & insights — click any chart to drill down</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]" data-testid="period-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {period === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[140px]" />
                            <span className="text-muted-foreground">to</span>
                            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[140px]" />
                        </div>
                    )}
                </div>
            </div>

            <PerformanceInsightBanner endpoint="/dashboard/performance-insight" />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')} data-testid="metric-revenue">
                    <CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p><p className="text-2xl font-bold font-mono text-primary mt-1">{fmtCur(stats.total_revenue)}</p><p className="text-xs text-muted-foreground mt-1">{stats.total_enrolled || 0} deals</p></CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')}>
                    <CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Total Leads</p><p className="text-2xl font-bold font-mono mt-1">{stats.total_leads || 0}</p><p className="text-xs text-muted-foreground mt-1">in selected period</p></CardContent>
                </Card>
                <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Conversion</p><p className="text-2xl font-bold font-mono mt-1">{stats.conversion_rate || 0}%</p><p className="text-xs text-muted-foreground mt-1">enrolled / total</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Deal</p><p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{fmtCur(stats.avg_deal_size)}</p></CardContent></Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => { setDrill({ open: true, title: "Today's Transactions", loading: false, breadcrumbs: [], content: (
                        <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>{(todayTxns.transactions || []).map((t, i) => (<TableRow key={i}><TableCell className="font-medium">{t.student_name}</TableCell><TableCell className="text-muted-foreground">{t.course_name}</TableCell><TableCell className="text-right font-mono text-emerald-500">{fmtCur(t.amount)}</TableCell></TableRow>))}</TableBody></Table>
                    ) }); }}>
                    <CardContent className="pt-5 pb-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p><p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{fmtCur(todayTxns.total_amount)}</p><p className="text-xs text-muted-foreground mt-1">{todayTxns.count} transactions</p></CardContent>
                </Card>
            </div>

            {/* Top 10 Agents + Team Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /><CardTitle className="text-base">Top 10 Agents</CardTitle></div>{canDrillDown && <CardDescription>Click any bar to see their closed students</CardDescription>}</CardHeader>
                    <CardContent>
                        {topAgentsOverall.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={topAgentsOverall} layout="vertical" margin={{ left: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ className: 'fill-foreground', fontSize: 10 }} width={110} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? fmtCur(v) : v, n]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="closings" fill="#EF3340" radius={[0, 4, 4, 0]} name="Closings" cursor={canDrillDown ? "pointer" : "default"}
                                        onClick={(data) => { if (canDrillDown && data?.agent_name) drillAgent(data.agent_name); }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><Layers className="h-5 w-5 text-blue-500" /><CardTitle className="text-base">Team-wise Revenue</CardTitle></div>{canDrillDown && <CardDescription>Click a team bar to see their agents</CardDescription>}</CardHeader>
                    <CardContent>
                        {teamRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={teamRevenue} margin={{ left: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="team_name" tick={{ className: 'fill-foreground', fontSize: 10 }} angle={-15} textAnchor="end" height={55} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => fmtCur(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue" cursor={canDrillDown ? "pointer" : "default"}
                                        onClick={(data) => { if (canDrillDown && data?.team_name) drillTeam(data.team_name); }}>
                                        {teamRevenue.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No team data</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend + Month Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><CardTitle className="text-base">Monthly Revenue Trend</CardTitle></div>{canDrillDown && <CardDescription>Click any month for detailed breakdown</CardDescription>}</CardHeader>
                    <CardContent>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={monthlyTrend} onClick={(e) => { if (canDrillDown && e?.activePayload?.[0]?.payload?.month) drillMonth(e.activePayload[0].payload.month); }}>
                                    <defs>
                                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF3340" stopOpacity={0.4} /><stop offset="95%" stopColor="#EF3340" stopOpacity={0} /></linearGradient>
                                        <linearGradient id="gDeals" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="month" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis yAxisId="l" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <YAxis yAxisId="r" orientation="right" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? fmtCur(v) : v, n]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Area yAxisId="l" type="monotone" dataKey="revenue" stroke="#EF3340" fillOpacity={1} fill="url(#gRev)" name="Revenue" />
                                    <Area yAxisId="r" type="monotone" dataKey="deals" stroke="#3b82f6" fillOpacity={1} fill="url(#gDeals)" name="Deals" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-500" /><CardTitle className="text-base">This Month vs Last Month</CardTitle></div><CardDescription>{monthComparison ? `${monthComparison.this_month_label} vs ${monthComparison.last_month_label} (cumulative)` : 'Loading...'}</CardDescription></CardHeader>
                    <CardContent>
                        {monthComparison?.data?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={monthComparison.data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="day" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => fmtCur(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Line type="monotone" dataKey="this_cumulative" stroke="#EF3340" strokeWidth={2.5} dot={{ r: 3 }} name={monthComparison.this_month_label} />
                                    <Line type="monotone" dataKey="last_cumulative" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name={monthComparison.last_month_label} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No comparison data</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Sales by Course + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="cursor-pointer" onClick={() => setDrill({ open: true, title: 'Sales by Course', loading: false, breadcrumbs: [], content: (
                    <Table><TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>{salesByCourse.map((c, i) => (<TableRow key={i}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right">{c.sales}</TableCell><TableCell className="text-right font-mono text-emerald-500">{fmtCur(c.revenue)}</TableCell></TableRow>))}</TableBody></Table>
                ) })}>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-primary" /><CardTitle className="text-base">Sales by Course</CardTitle></div><CardDescription>Click to see breakdown</CardDescription></CardHeader>
                    <CardContent>
                        {salesByCourse.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart><Pie data={salesByCourse} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3} dataKey="revenue" label={({ name, percent }) => percent > 0.06 ? name.substring(0, 14) : ''} labelLine={false}>
                                    {salesByCourse.map((entry, i) => (<Cell key={i} fill={entry.fill} stroke="transparent" />))}
                                </Pie><Tooltip formatter={(v) => fmtCur(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} /><Legend wrapperStyle={{ fontSize: '11px' }} /></PieChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /><CardTitle className="text-base">Monthly Leaderboard</CardTitle></div></div>{canDrillDown && <CardDescription>Click agent to see their students</CardDescription>}</CardHeader>
                    <CardContent>
                        {leaderboard.length > 0 ? (
                            <div className="space-y-2">
                                {leaderboard.slice(0, 5).map((entry, i) => (
                                    <div key={entry.user_id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${canDrillDown ? 'cursor-pointer' : ''} ${entry.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}
                                        onClick={() => canDrillDown && drillAgent(entry.name, [{ label: 'Leaderboard' }])} data-testid={`leaderboard-agent-${i}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>{entry.rank}</div>
                                            <div><p className="font-medium text-sm">{entry.name}</p><p className="text-xs text-muted-foreground">{entry.deals} deals</p></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold font-mono text-sm">{fmtCur(entry.revenue)}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center text-muted-foreground py-8">No data this month</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline + Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle className="text-base">Lead Pipeline</CardTitle></div>{canDrillDown && <CardDescription>Click any stage to see lead & agent breakdown</CardDescription>}</CardHeader>
                    <CardContent>
                        {leadFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={leadFunnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" tick={{ className: 'fill-foreground', fontSize: 10 }} width={95} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor={canDrillDown ? "pointer" : "default"}
                                        onClick={(data) => { if (canDrillDown && data?.stage) drillPipeline(data.name, data.stage); }}>
                                        {leadFunnel.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-6"><PipelineRevenueWidget /></div>
            </div>

            {/* Drill-down Dialog */}
            <Dialog open={drill.open} onOpenChange={(o) => { if (!o) closeDrill(); }}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="drill-down-modal">
                    <DialogHeader>
                        {drill.breadcrumbs?.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                {drill.breadcrumbs.map((bc, i) => (<span key={i} className="flex items-center gap-1">{i > 0 && <ChevronRight className="h-3 w-3" />}{bc.label}</span>))}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        )}
                        <DialogTitle>{drill.title}</DialogTitle>
                        <DialogDescription>Click rows with arrows for deeper drill-down</DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1">
                        {drill.loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}
                        {!drill.loading && drill.content}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesDashboard;
