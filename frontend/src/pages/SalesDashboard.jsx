import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipelineRevenueWidget } from '@/components/PipelineRevenueWidget';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area,
    LineChart, Line,
} from 'recharts';
import {
    DollarSign, TrendingUp, Users, Target, Award, Eye, Filter,
    BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDown, ArrowUp,
    Layers, ChevronRight, X,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
    { value: 'custom', label: 'Custom Range' },
];

const SalesDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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
    const [drillModal, setDrillModal] = useState({ open: false, title: '', data: [], type: '', loading: false, breadcrumbs: [] });

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
        try {
            const [funnelRes, courseRes, trendRes, todayRes, compRes] = await Promise.all([
                apiClient.get('/dashboard/lead-funnel'),
                apiClient.get('/dashboard/sales-by-course'),
                apiClient.get('/dashboard/monthly-trend'),
                apiClient.get('/dashboard/today-transactions'),
                apiClient.get('/dashboard/month-comparison'),
            ]);
            setLeadFunnel(funnelRes.data.map(item => ({ name: formatStageName(item._id), value: item.count, stage: item._id })));
            const rawCourses = courseRes.data.map(item => ({ name: item.course_name || 'Unknown', sales: item.count, revenue: item.revenue || 0 })).sort((a, b) => b.revenue - a.revenue);
            const top8 = rawCourses.slice(0, 8);
            const others = rawCourses.slice(8);
            if (others.length > 0) top8.push({ name: `Others (${others.length})`, sales: others.reduce((s, c) => s + c.sales, 0), revenue: others.reduce((s, c) => s + c.revenue, 0) });
            setSalesByCourse(top8.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] })));
            setMonthlyTrend(trendRes.data.map(item => ({ month: item._id, deals: item.deals, revenue: item.revenue })));
            setTodayTxns(todayRes.data || { count: 0, total_amount: 0, transactions: [] });
            setMonthComparison(compRes.data || null);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchFilteredData = async () => {
        try {
            const pq = periodQuery();
            const [statsRes, agentsRes, leaderRes, teamRes] = await Promise.all([
                apiClient.get(`/dashboard/filtered-stats?${pq}`),
                apiClient.get(`/dashboard/sales-agent-closings?${pq}&limit=10`),
                apiClient.get('/dashboard/leaderboard'),
                apiClient.get(`/dashboard/team-revenue?${pq}`),
            ]);
            setFilteredStats(statsRes.data || {});
            setTopAgentsOverall(agentsRes.data || []);
            setLeaderboard(leaderRes.data || []);
            setTeamRevenue(teamRes.data || []);
        } catch (err) { console.error(err); }
    };

    const formatStageName = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
    const formatCurrency = (a) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(a || 0);

    // ====== DRILL-DOWN HANDLERS ======

    const openDrillDown = (title, data, type, breadcrumbs = []) => setDrillModal({ open: true, title, data, type, loading: false, breadcrumbs });

    // Top 10 agent click → show their closed students
    const drillAgentStudents = async (agent) => {
        setDrillModal({ open: true, title: `${agent.agent_name} - Closed Students`, data: [], type: 'agent_students', loading: true, breadcrumbs: [{ label: 'Top 10 Agents' }] });
        try {
            const pq = periodQuery();
            // Find the agent's user_id from leads
            const res = await apiClient.get(`/dashboard/sales-agent-closings?${pq}&limit=50`);
            const agentData = res.data?.find(a => a.agent_name === agent.agent_name);
            // Fetch leads from the agent by their ID using the search
            const leadsRes = await apiClient.get(`/leads?stage=enrolled&limit=200`);
            const agentLeads = (leadsRes.data || []).filter(l => l.assigned_to_name === agent.agent_name);
            setDrillModal(prev => ({ ...prev, data: agentLeads, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    // Team revenue click → agents
    const openTeamDrill = async (team) => {
        setDrillModal({ open: true, title: `${team.team_name} - Agent Revenue`, data: [], type: 'team_agents', loading: true, breadcrumbs: [{ label: 'Team Revenue' }] });
        try {
            const pq = periodQuery();
            const res = await apiClient.get(`/dashboard/team-revenue/${encodeURIComponent(team.team_name)}/agents?${pq}`);
            setDrillModal(prev => ({ ...prev, data: res.data || [], loading: false, extra: { team_name: team.team_name } }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    // Team agent click → their enrolled students
    const drillTeamAgentStudents = async (agent, teamName) => {
        setDrillModal(prev => ({ ...prev, title: `${agent.agent_name} - Students in ${teamName}`, data: [], type: 'team_agent_students', loading: true, breadcrumbs: [{ label: 'Team Revenue' }, { label: teamName }] }));
        try {
            const leadsRes = await apiClient.get(`/leads?stage=enrolled&limit=200`);
            const students = (leadsRes.data || []).filter(l => l.assigned_to_name === agent.agent_name && l.team_name === teamName);
            setDrillModal(prev => ({ ...prev, data: students, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    // Lead pipeline click → stage details
    const drillPipelineStage = async (stageItem) => {
        setDrillModal({ open: true, title: `${stageItem.name} - Lead Details`, data: [], type: 'pipeline_stage', loading: true, breadcrumbs: [{ label: 'Lead Pipeline' }] });
        try {
            const pq = periodQuery();
            const res = await apiClient.get(`/dashboard/lead-pipeline/${stageItem.stage}/details?${pq}`);
            setDrillModal(prev => ({ ...prev, data: res.data || {}, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    // Monthly trend click → month breakdown
    const drillMonthDetails = async (monthData) => {
        if (!monthData?.month) return;
        const monthLabel = monthData.month;
        setDrillModal({ open: true, title: `${monthLabel} - Revenue Breakdown`, data: [], type: 'month_details', loading: true, breadcrumbs: [{ label: 'Monthly Trend' }] });
        try {
            const shortMonth = monthLabel.substring(0, 3);
            const res = await apiClient.get(`/dashboard/monthly-revenue/${shortMonth}/details`);
            setDrillModal(prev => ({ ...prev, data: res.data || {}, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    if (loading) return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);

    const stats = filteredStats;

    return (
        <div className="space-y-6" data-testid="sales-dashboard">
            {/* Header + Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
                    <p className="text-muted-foreground">Performance analytics & insights - click any chart to drill down</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]" data-testid="period-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {period === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-[140px]" data-testid="custom-start" />
                            <span className="text-muted-foreground">to</span>
                            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-[140px]" data-testid="custom-end" />
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')} data-testid="metric-revenue">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                        <p className="text-2xl font-bold font-mono text-primary mt-1">{formatCurrency(stats.total_revenue)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.total_enrolled || 0} deals</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')}>
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Leads</p>
                        <p className="text-2xl font-bold font-mono mt-1">{stats.total_leads || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">in selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversion</p>
                        <p className="text-2xl font-bold font-mono mt-1">{stats.conversion_rate || 0}%</p>
                        <p className="text-xs text-muted-foreground mt-1">enrolled / total leads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Deal</p>
                        <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{formatCurrency(stats.avg_deal_size)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => openDrillDown("Today's Transactions", todayTxns.transactions || [], 'transactions')}>
                    <CardContent className="pt-5 pb-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
                        <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{formatCurrency(todayTxns.total_amount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{todayTxns.count} transactions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Top 10 Agents + Team Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-500" />
                            <CardTitle className="text-base">Top 10 Agents</CardTitle>
                        </div>
                        <CardDescription>Click any bar to see closed students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topAgentsOverall.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={topAgentsOverall} layout="vertical" margin={{ left: 5 }}
                                    onClick={(e) => { if (e?.activePayload) drillAgentStudents(e.activePayload[0].payload); }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ className: 'fill-foreground', fontSize: 10 }} width={110} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? formatCurrency(v) : v, n]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="closings" fill="#EF3340" radius={[0, 4, 4, 0]} name="Closings" cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data for this period</div>)}
                    </CardContent>
                </Card>

                {/* Team Revenue */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-base">Team-wise Revenue</CardTitle>
                        </div>
                        <CardDescription>Click a bar to drill down into individual agents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {teamRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={teamRevenue} margin={{ left: 5 }} onClick={(e) => {
                                    if (e && e.activePayload) openTeamDrill(e.activePayload[0].payload);
                                }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="team_name" tick={{ className: 'fill-foreground', fontSize: 10 }} angle={-15} textAnchor="end" height={55} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue" cursor="pointer">
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
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
                        </div>
                        <CardDescription>Click any month for details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={monthlyTrend} onClick={(e) => { if (e?.activePayload) drillMonthDetails(e.activePayload[0].payload); }}>
                                    <defs>
                                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF3340" stopOpacity={0.4}/><stop offset="95%" stopColor="#EF3340" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="gDeals" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="month" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis yAxisId="l" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                                    <YAxis yAxisId="r" orientation="right" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? formatCurrency(v) : v, n]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Area yAxisId="l" type="monotone" dataKey="revenue" stroke="#EF3340" fillOpacity={1} fill="url(#gRev)" name="Revenue" />
                                    <Area yAxisId="r" type="monotone" dataKey="deals" stroke="#3b82f6" fillOpacity={1} fill="url(#gDeals)" name="Deals" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>

                {/* Month vs Month Comparison */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-emerald-500" />
                            <CardTitle className="text-base">This Month vs Last Month</CardTitle>
                        </div>
                        <CardDescription>
                            {monthComparison ? `${monthComparison.this_month_label} vs ${monthComparison.last_month_label} (cumulative)` : 'Loading...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthComparison?.data?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={monthComparison.data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis dataKey="day" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
                <Card className="cursor-pointer" onClick={() => openDrillDown('Sales by Course', salesByCourse, 'courses')}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">Sales by Course</CardTitle>
                        </div>
                        <CardDescription>Click to see breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {salesByCourse.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie data={salesByCourse} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3} dataKey="revenue"
                                        label={({ name, percent }) => percent > 0.06 ? name.substring(0, 14) : ''} labelLine={false}>
                                        {salesByCourse.map((entry, i) => (<Cell key={i} fill={entry.fill} stroke="transparent" />))}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /><CardTitle className="text-base">Monthly Leaderboard</CardTitle></div>
                            <Button variant="ghost" size="sm" onClick={() => openDrillDown('Full Leaderboard', leaderboard, 'leaderboard')}><Eye className="h-4 w-4 mr-1" />All</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {leaderboard.length > 0 ? (
                            <div className="space-y-2">
                                {leaderboard.slice(0, 5).map((entry, i) => (
                                    <div key={entry.user_id} className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${entry.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}
                                        onClick={() => drillAgentStudents({ agent_name: entry.name })} data-testid={`leaderboard-agent-${i}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>{entry.rank}</div>
                                            <div><p className="font-medium text-sm">{entry.name}</p><p className="text-xs text-muted-foreground">{entry.deals} deals</p></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold font-mono text-sm">{formatCurrency(entry.revenue)}</span>
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
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle className="text-base">Lead Pipeline</CardTitle></div>
                        <CardDescription>Click any stage to see detailed lead & agent breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leadFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={leadFunnel} layout="vertical"
                                    onClick={(e) => { if (e?.activePayload) drillPipelineStage(e.activePayload[0].payload); }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" tick={{ className: 'fill-foreground', fontSize: 10 }} width={95} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer">{leadFunnel.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-48 flex items-center justify-center text-muted-foreground">No data</div>)}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-6">
                    <PipelineRevenueWidget />
                </div>
            </div>

            {/* Drill-down Modal */}
            <Dialog open={drillModal.open} onOpenChange={(o) => setDrillModal(prev => ({ ...prev, open: o }))}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="drill-down-modal">
                    <DialogHeader>
                        {drillModal.breadcrumbs?.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                {drillModal.breadcrumbs.map((bc, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                                        {bc.label}
                                    </span>
                                ))}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        )}
                        <DialogTitle>{drillModal.title}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1">
                        {drillModal.loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}

                        {/* Team → Agents table with further drill */}
                        {!drillModal.loading && drillModal.type === 'team_agents' && (
                            <Table>
                                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                <TableBody>{drillModal.data.map((a, i) => (
                                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => drillTeamAgentStudents(a, drillModal.extra?.team_name)}>
                                        <TableCell className="font-bold">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{a.agent_name}</TableCell>
                                        <TableCell className="text-right">{a.deals}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(a.revenue)}</TableCell>
                                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                        )}

                        {/* Agent → Students */}
                        {!drillModal.loading && (drillModal.type === 'agent_students' || drillModal.type === 'team_agent_students') && (
                            <>
                                <Badge variant="secondary" className="mb-3">{drillModal.data.length} students</Badge>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Enrolled</TableHead></TableRow></TableHeader>
                                    <TableBody>{drillModal.data.map((s, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{s.course_of_interest || s.course_name}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(s.enrollment_amount)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{s.enrolled_at?.substring(0, 10)}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                                {drillModal.data.length === 0 && <p className="text-center text-muted-foreground py-4">No students found</p>}
                            </>
                        )}

                        {/* Pipeline Stage Details */}
                        {!drillModal.loading && drillModal.type === 'pipeline_stage' && drillModal.data?.agent_breakdown && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-lg px-3 py-1">{drillModal.data.total} leads</Badge>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Agent-wise Breakdown</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {drillModal.data.agent_breakdown.map((a, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                                <span className="text-sm font-medium truncate">{a.agent_name}</span>
                                                <Badge variant="secondary">{a.count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Leads ({Math.min(drillModal.data.leads?.length || 0, 50)} shown)</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Agent</TableHead><TableHead>Course</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                                        <TableBody>{(drillModal.data.leads || []).slice(0, 50).map((l, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{l.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{l.assigned_to_name || 'Unassigned'}</TableCell>
                                                <TableCell className="text-muted-foreground">{l.course_of_interest}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{l.created_at?.substring(0, 10)}</TableCell>
                                            </TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Month Details */}
                        {!drillModal.loading && drillModal.type === 'month_details' && drillModal.data?.by_course && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="text-base px-3 py-1">{formatCurrency(drillModal.data.total_revenue)}</Badge>
                                    <Badge variant="secondary">{drillModal.data.total_enrolled} deals</Badge>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">By Course</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                        <TableBody>{drillModal.data.by_course.map((c, i) => (
                                            <TableRow key={i}><TableCell className="font-medium">{c.course}</TableCell><TableCell className="text-right">{c.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(c.revenue)}</TableCell></TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">By Agent</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                        <TableBody>{drillModal.data.by_agent.map((a, i) => (
                                            <TableRow key={i}><TableCell className="font-medium">{a.agent}</TableCell><TableCell className="text-right">{a.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(a.revenue)}</TableCell></TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Leaderboard */}
                        {!drillModal.loading && drillModal.type === 'leaderboard' && (
                            <Table>
                                <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>{drillModal.data.map((e) => (
                                    <TableRow key={e.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => drillAgentStudents({ agent_name: e.name })}>
                                        <TableCell className="font-bold">{e.rank}</TableCell><TableCell className="font-medium">{e.name}</TableCell><TableCell className="text-right">{e.deals}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(e.revenue)}</TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                        )}

                        {/* Transactions */}
                        {!drillModal.loading && drillModal.type === 'transactions' && (
                            <Table>
                                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                <TableBody>{drillModal.data.map((t, i) => (
                                    <TableRow key={i}><TableCell className="font-medium">{t.student_name}</TableCell><TableCell className="text-muted-foreground">{t.course_name}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(t.amount)}</TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        )}

                        {/* Courses */}
                        {!drillModal.loading && drillModal.type === 'courses' && (
                            <Table>
                                <TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                <TableBody>{drillModal.data.map((c, i) => (
                                    <TableRow key={i}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right">{c.sales}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(c.revenue)}</TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesDashboard;
