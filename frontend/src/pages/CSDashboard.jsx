import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import {
    Users, TrendingUp, Award, Target, DollarSign,
    Filter, ShieldCheck, Trophy, Zap, ChevronRight,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' }, { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' }, { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' }, { value: 'overall', label: 'Overall' },
];

const fmtCur = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const ChartTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg text-popover-foreground text-xs">
            <p className="font-medium mb-1">{label}</p>
            {payload.map((p, i) => (<p key={i} style={{ color: p.color }}>{p.name}: {formatter ? formatter(p.value) : p.value}</p>))}
        </div>
    );
};

const CSDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [agentRevenue, setAgentRevenue] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [monthComparison, setMonthComparison] = useState({ data: [], this_month_label: '', last_month_label: '' });
    const [pipeline, setPipeline] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [agentBifurcation, setAgentBifurcation] = useState([]);
    const [period, setPeriod] = useState('overall');
    const isHeadOrAdmin = ['cs_head', 'super_admin', 'admin'].includes(user?.role);
    const [viewMode, setViewMode] = useState(isHeadOrAdmin ? 'team' : 'individual');
    const [loading, setLoading] = useState(true);
    const [drill, setDrill] = useState({ open: false, title: '', content: null, loading: false });

    useEffect(() => { fetchAll(); }, [period, viewMode]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [statsRes, agentRevRes, trendRes, compRes, pipeRes, leadRes, bifRes] = await Promise.all([
                apiClient.get(`/cs/dashboard/stats?period=${period}&view_mode=${viewMode}`),
                apiClient.get(`/cs/dashboard/agent-revenue?period=${period}`),
                apiClient.get('/cs/dashboard/monthly-trend'),
                apiClient.get('/cs/dashboard/month-comparison'),
                apiClient.get(`/cs/dashboard/pipeline?view_mode=${viewMode}`),
                apiClient.get(`/cs/dashboard/leaderboard?period=${period}`),
                apiClient.get(`/dashboard/cs-agent-bifurcation?period=${period}`),
            ]);
            setStats(statsRes.data);
            setAgentRevenue(agentRevRes.data || []);
            setMonthlyTrend(trendRes.data || []);
            setMonthComparison(compRes.data || { data: [], this_month_label: '', last_month_label: '' });
            setPipeline(pipeRes.data || []);
            setLeaderboard(leadRes.data || []);
            setAgentBifurcation(bifRes.data || []);
        } catch (error) { console.error('Failed to fetch CS dashboard:', error); }
        finally { setLoading(false); }
    };

    const closeDrill = () => setDrill({ open: false, title: '', content: null, loading: false });
    const openDrillLoading = (title) => setDrill({ open: true, title, content: null, loading: true });

    // ====== CS Agent Students drill ======
    const drillCsAgent = async (agentName) => {
        openDrillLoading(`${agentName} — Student Details`);
        try {
            const res = await apiClient.get(`/cs/drill/agent-students?agent_name=${encodeURIComponent(agentName)}`);
            const students = res.data || [];
            const withUpgrades = students.filter(s => s.upgrade_count > 0);
            const totalRev = students.reduce((s, st) => s + (st.upgrade_revenue || 0), 0);
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="secondary">{students.length} total students</Badge>
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{withUpgrades.length} upgraded</Badge>
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30">{fmtCur(totalRev)} upgrade revenue</Badge>
                        </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Code</TableHead><TableHead>Stage</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Upgrades</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {students.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No students found</TableCell></TableRow>}
                                {students.map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{s.student_name}</TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">{s.student_code || '-'}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-xs capitalize">{(s.stage || '').replace(/_/g, ' ')}</Badge></TableCell>
                                        <TableCell className="text-muted-foreground">{s.course}</TableCell>
                                        <TableCell className="text-right">{s.upgrade_count}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{s.upgrade_revenue > 0 ? fmtCur(s.upgrade_revenue) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-center text-muted-foreground py-4">Failed to load</p> })); }
    };

    // ====== CS Pipeline drill ======
    const drillCsPipeline = async (stageLabel) => {
        openDrillLoading(`${stageLabel} — Student Details`);
        try {
            const stageKey = stageLabel.toLowerCase().replace(/ /g, '_');
            const res = await apiClient.get(`/cs/drill/pipeline-stage?stage=${stageKey}`);
            const d = res.data || {};
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-4">
                        <Badge variant="outline" className="text-lg px-3 py-1">{d.total} students</Badge>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Agent-wise Breakdown</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {(d.agent_breakdown || []).map((a, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70"
                                        onClick={() => drillCsAgent(a.agent_name)}>
                                        <span className="text-sm font-medium truncate">{a.agent_name}</span>
                                        <div className="flex items-center gap-1"><Badge variant="secondary">{a.count}</Badge><ChevronRight className="h-3 w-3 text-muted-foreground" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Students</h4>
                            <Table>
                                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Code</TableHead><TableHead>Agent</TableHead><TableHead>Course</TableHead><TableHead>Pitched</TableHead></TableRow></TableHeader>
                                <TableBody>{(d.students || []).slice(0, 50).map((s, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{s.student_name}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{s.student_code || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{s.agent || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{s.course}</TableCell>
                                        <TableCell className="text-xs">{s.pitched || '-'}</TableCell>
                                    </TableRow>
                                ))}</TableBody>
                            </Table>
                        </div>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-center text-muted-foreground py-4">Failed to load</p> })); }
    };

    // ====== CS Bifurcation drill ======
    const drillBifurcation = async (agent) => {
        openDrillLoading(`${agent.agent_name} — Stage Breakdown`);
        try {
            const res = await apiClient.get(`/cs/drill/agent-students?agent_name=${encodeURIComponent(agent.agent_name)}`);
            const students = res.data || [];
            const stageGroups = {};
            students.forEach(s => { const st = s.stage || 'unknown'; if (!stageGroups[st]) stageGroups[st] = []; stageGroups[st].push(s); });
            setDrill(prev => ({
                ...prev, loading: false,
                content: (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary">{students.length} total students</Badge>
                            <Badge variant="outline">SLA Rate: {agent.sla_rate || 0}%</Badge>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-2">By Stage</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                {Object.entries(stageGroups).map(([stage, sts]) => (
                                    <div key={stage} className="p-3 rounded-lg bg-muted/50 text-center">
                                        <p className="text-lg font-bold">{sts.length}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{stage.replace(/_/g, ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Stage</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Upgrades</TableHead></TableRow></TableHeader>
                            <TableBody>{students.slice(0, 50).map((s, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{s.student_name}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs capitalize">{(s.stage || '').replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell className="text-muted-foreground">{s.course}</TableCell>
                                    <TableCell className="text-right">{s.upgrade_count || 0}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </div>
                )
            }));
        } catch { setDrill(prev => ({ ...prev, loading: false, content: <p className="text-center text-muted-foreground py-4">Failed to load</p> })); }
    };

    if (loading) return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);

    const totalPipeline = pipeline.reduce((s, p) => s + p.revenue, 0);

    return (
        <div className="space-y-6" data-testid="cs-dashboard">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">CS Dashboard</h1>
                    <p className="text-muted-foreground">Upgrade revenue, commissions & team performance — click charts to drill down</p>
                </div>
                <div className="flex items-center gap-3">
                    {isHeadOrAdmin && (
                        <div className="inline-flex rounded-lg border p-1 bg-muted/30" data-testid="cs-dash-view-toggle">
                            <button onClick={() => setViewMode('individual')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'individual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Individual</button>
                            <button onClick={() => setViewMode('team')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Team</button>
                        </div>
                    )}
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]" data-testid="cs-period-filter"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className={`grid grid-cols-2 ${isHeadOrAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-4`}>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <CardContent className="pt-5 pb-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Achieved Revenue</p><p className="text-2xl font-bold font-mono text-emerald-500 mt-1" data-testid="achieved-revenue">{fmtCur(stats.achieved_revenue)}</p><p className="text-xs text-muted-foreground mt-1">{stats.achieved_count || 0} upgrades</p></div><div className="p-2.5 rounded-xl bg-emerald-500/20"><DollarSign className="h-6 w-6 text-emerald-500" /></div></div></CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <CardContent className="pt-5 pb-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pipeline Revenue</p><p className="text-2xl font-bold font-mono text-amber-500 mt-1" data-testid="pipeline-revenue">{fmtCur(stats.pipeline_revenue)}</p><p className="text-xs text-muted-foreground mt-1">{stats.pipeline_count || 0} pitched</p></div><div className="p-2.5 rounded-xl bg-amber-500/20"><Target className="h-6 w-6 text-amber-500" /></div></div></CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-5 pb-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Agent Commission</p><p className="text-2xl font-bold font-mono text-blue-500 mt-1" data-testid="agent-commission">{fmtCur(stats.total_agent_commission)}</p></div><div className="p-2.5 rounded-xl bg-blue-500/20"><Award className="h-6 w-6 text-blue-500" /></div></div></CardContent>
                </Card>
                {isHeadOrAdmin && (
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                        <CardContent className="pt-5 pb-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Head Commission</p><p className="text-2xl font-bold font-mono text-purple-500 mt-1" data-testid="head-commission">{fmtCur(stats.total_head_commission)}</p></div><div className="p-2.5 rounded-xl bg-purple-500/20"><ShieldCheck className="h-6 w-6 text-purple-500" /></div></div></CardContent>
                    </Card>
                )}
                {isHeadOrAdmin && (
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="pt-5 pb-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Commission</p><p className="text-2xl font-bold font-mono text-primary mt-1" data-testid="total-commission">{fmtCur(stats.total_commission)}</p></div><div className="p-2.5 rounded-xl bg-primary/20"><Zap className="h-6 w-6 text-primary" /></div></div></CardContent>
                    </Card>
                )}
            </div>

            {/* Agent Revenue + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2"><CardTitle className="text-base">Agent Revenue Closed</CardTitle><CardDescription>Click any bar to see agent's students</CardDescription></CardHeader>
                    <CardContent>
                        {agentRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={agentRevenue} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} width={100} />
                                    <Tooltip content={<ChartTooltip formatter={fmtCur} />} />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue" cursor="pointer"
                                        onClick={(data) => { if (data?.agent_name) drillCsAgent(data.agent_name); }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No revenue data yet</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Leaderboard</CardTitle><CardDescription>Click agent to see their students & upgrades</CardDescription></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {leaderboard.slice(0, 5).map((agent, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => drillCsAgent(agent.agent_name)} data-testid={`cs-leaderboard-${idx}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{agent.agent_name}</p>
                                        <p className="text-xs text-muted-foreground">{agent.upgrades} upgrades</p>
                                    </div>
                                    <div className="text-right flex items-center gap-1">
                                        <div><p className="text-sm font-bold font-mono text-emerald-500">{fmtCur(agent.revenue)}</p><p className="text-[10px] text-muted-foreground">{agent.upgrades} upgrades</p></div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No upgrade data yet</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend + Month vs Month */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Revenue Trend</CardTitle><CardDescription>Upgrade revenue & commission over time</CardDescription></CardHeader>
                    <CardContent>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={monthlyTrend}>
                                    <defs><linearGradient id="csRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="month" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip content={<ChartTooltip formatter={fmtCur} />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#csRevGrad)" strokeWidth={2} name="Revenue" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-52 flex items-center justify-center text-muted-foreground">No monthly data</div>)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">This Month vs Last Month</CardTitle><CardDescription>{monthComparison.this_month_label} vs {monthComparison.last_month_label} (cumulative)</CardDescription></CardHeader>
                    <CardContent>
                        {monthComparison.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={monthComparison.data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="day" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip content={<ChartTooltip formatter={fmtCur} />} />
                                    <Line type="monotone" dataKey="this_month" stroke="#10b981" strokeWidth={2.5} dot={false} name={monthComparison.this_month_label} />
                                    <Line type="monotone" dataKey="last_month" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" dot={false} name={monthComparison.last_month_label} />
                                    <Legend />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-52 flex items-center justify-center text-muted-foreground">No comparison data</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline + Agent Bifurcation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div><CardTitle className="text-base">Upgrade Pipeline</CardTitle><CardDescription>Click any item to see student details</CardDescription></div>
                            <Badge variant="outline" className="text-amber-500 border-amber-500/40 font-mono">{fmtCur(totalPipeline)}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {pipeline.length > 0 ? (
                            <div className="space-y-3">
                                {pipeline.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => drillCsPipeline(p.label)}>
                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20` }}>
                                            <Target className="h-4 w-4" style={{ color: COLORS[idx % COLORS.length] }} />
                                        </div>
                                        <div className="flex-1"><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-muted-foreground">{p.count} students</p></div>
                                        <div className="flex items-center gap-2"><p className="text-lg font-bold font-mono">{fmtCur(p.revenue)}</p><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="h-40 flex flex-col items-center justify-center text-muted-foreground"><Target className="h-8 w-8 mb-2 opacity-30" /><p className="text-sm">No upgrades in pipeline</p></div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Agent Bifurcation</CardTitle><CardDescription>Click any bar to see agent's student breakdown by stage</CardDescription></CardHeader>
                    <CardContent>
                        {agentBifurcation.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={agentBifurcation}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="agent_name" tick={{ className: 'fill-muted-foreground', fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="total_students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" cursor="pointer"
                                        onClick={(data) => { if (data?.agent_name) drillBifurcation(data); }} />
                                    <Bar dataKey="activated" fill="#10b981" radius={[4, 4, 0, 0]} name="Activated" cursor="pointer"
                                        onClick={(data) => { if (data?.agent_name) drillBifurcation(data); }} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-52 flex items-center justify-center text-muted-foreground">No agent data</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Drill-Down Dialog */}
            <Dialog open={drill.open} onOpenChange={(o) => { if (!o) closeDrill(); }}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="cs-drill-modal">
                    <DialogHeader><DialogTitle>{drill.title}</DialogTitle><DialogDescription>Detailed view</DialogDescription></DialogHeader>
                    <div className="overflow-y-auto flex-1">
                        {drill.loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}
                        {!drill.loading && drill.content}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CSDashboard;
