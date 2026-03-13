import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import {
    Users, TrendingUp, Award, Target, DollarSign, Star,
    Filter, ShieldCheck, Trophy, Zap, ChevronRight,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];

const formatCurrency = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const ChartTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg text-popover-foreground text-xs">
            <p className="font-medium mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {formatter ? formatter(p.value) : p.value}
                </p>
            ))}
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
    const [viewMode, setViewMode] = useState('team');
    const [loading, setLoading] = useState(true);
    const [drillModal, setDrillModal] = useState({ open: false, title: '', data: [], type: '', loading: false });

    const isHeadOrAdmin = ['cs_head', 'super_admin', 'admin'].includes(user?.role);

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
        } catch (error) {
            console.error('Failed to fetch CS dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // ====== DRILL-DOWN HANDLERS ======
    const drillAgentStudents = async (agentName) => {
        setDrillModal({ open: true, title: `${agentName} - Students`, data: [], type: 'cs_agent_students', loading: true });
        try {
            // Find agent_id from agentRevenue or bifurcation
            const studentsRes = await apiClient.get(`/students?limit=500`);
            const students = (studentsRes.data || []).filter(s => s.cs_agent_name === agentName);
            setDrillModal(prev => ({ ...prev, data: students, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    const drillPipelineItem = async (pipelineItem) => {
        setDrillModal({ open: true, title: `${pipelineItem.label} - Students`, data: [], type: 'cs_pipeline_detail', loading: true });
        try {
            const res = await apiClient.get(`/cs/dashboard/pipeline/pitched_for_upgrade/details`);
            setDrillModal(prev => ({ ...prev, data: res.data || {}, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    const drillBifurcationAgent = async (agent) => {
        setDrillModal({ open: true, title: `${agent.agent_name} - Student Breakdown`, data: [], type: 'cs_bifurcation_detail', loading: true });
        try {
            const studentsRes = await apiClient.get(`/students?limit=500`);
            const students = (studentsRes.data || []).filter(s => s.cs_agent_name === agent.agent_name);
            // Group by stage
            const stageGroups = {};
            students.forEach(s => {
                const stage = s.stage || 'unknown';
                if (!stageGroups[stage]) stageGroups[stage] = [];
                stageGroups[stage].push(s);
            });
            setDrillModal(prev => ({ ...prev, data: { students, stageGroups, agent }, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    if (loading) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    const totalPipeline = pipeline.reduce((s, p) => s + p.revenue, 0);

    return (
        <div className="space-y-6" data-testid="cs-dashboard">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">CS Dashboard</h1>
                    <p className="text-muted-foreground">Upgrade revenue, commissions & team performance - click charts to drill down</p>
                </div>
                <div className="flex items-center gap-3">
                    {isHeadOrAdmin && (
                        <div className="inline-flex rounded-lg border p-1 bg-muted/30" data-testid="cs-dash-view-toggle">
                            <button onClick={() => setViewMode('individual')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'individual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} data-testid="cs-dash-individual">Individual</button>
                            <button onClick={() => setViewMode('team')} className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} data-testid="cs-dash-team">Team</button>
                        </div>
                    )}
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]" data-testid="cs-period-filter">
                            <Filter className="h-3 w-3 mr-1" /><SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Achieved Revenue</p>
                                <p className="text-2xl font-bold font-mono text-emerald-500 mt-1" data-testid="achieved-revenue">{formatCurrency(stats.achieved_revenue)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats.achieved_count || 0} upgrades closed</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-500/20"><DollarSign className="h-6 w-6 text-emerald-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pipeline Revenue</p>
                                <p className="text-2xl font-bold font-mono text-amber-500 mt-1" data-testid="pipeline-revenue">{formatCurrency(stats.pipeline_revenue)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats.pipeline_count || 0} pitched</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-500/20"><Target className="h-6 w-6 text-amber-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Agent Commission</p>
                                <p className="text-2xl font-bold font-mono text-blue-500 mt-1" data-testid="agent-commission">{formatCurrency(stats.total_agent_commission)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats.total_upgrades || 0} total</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-blue-500/20"><Award className="h-6 w-6 text-blue-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Head Commission</p>
                                <p className="text-2xl font-bold font-mono text-purple-500 mt-1" data-testid="head-commission">{formatCurrency(stats.total_head_commission)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-purple-500/20"><ShieldCheck className="h-6 w-6 text-purple-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Commission</p>
                                <p className="text-2xl font-bold font-mono text-primary mt-1" data-testid="total-commission">{formatCurrency(stats.total_commission)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/20"><Zap className="h-6 w-6 text-primary" /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Revenue + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Agent Revenue Closed</CardTitle>
                        <CardDescription>Click any bar to see agent's students</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {agentRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={agentRevenue} layout="vertical"
                                    onClick={(e) => { if (e?.activePayload) drillAgentStudents(e.activePayload[0].payload.agent_name); }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis type="number" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} width={100} />
                                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue" cursor="pointer" />
                                    <Bar dataKey="commission" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Commission" cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">No revenue data yet</div>
                        )}
                    </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Leaderboard</CardTitle>
                        </div>
                        <CardDescription>Click agent to see details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {leaderboard.slice(0, 5).map((agent, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => drillAgentStudents(agent.agent_name)} data-testid={`leaderboard-${idx}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{agent.agent_name}</p>
                                        <p className="text-xs text-muted-foreground">{agent.upgrades} upgrades</p>
                                    </div>
                                    <div className="text-right flex items-center gap-1">
                                        <div>
                                            <p className="text-sm font-bold font-mono text-emerald-500">{formatCurrency(agent.commission)}</p>
                                            <p className="text-[10px] text-muted-foreground">{formatCurrency(agent.revenue)} rev</p>
                                        </div>
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
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
                        <CardDescription>Upgrade revenue & commission over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={monthlyTrend}>
                                    <defs>
                                        <linearGradient id="csRevGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="month" tick={{ className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#csRevGrad)" strokeWidth={2} name="Revenue" />
                                    <Area type="monotone" dataKey="commission" stroke="#3b82f6" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Commission" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-52 flex items-center justify-center text-muted-foreground">No monthly data yet</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">This Month vs Last Month</CardTitle>
                        <CardDescription>{monthComparison.this_month_label} vs {monthComparison.last_month_label} (cumulative)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {monthComparison.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={monthComparison.data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="day" tick={{ className: 'fill-muted-foreground', fontSize: 11 }} label={{ value: 'Day', position: 'insideBottom', offset: -5, className: 'fill-muted-foreground', fontSize: 10 }} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                                    <Line type="monotone" dataKey="this_month" stroke="#10b981" strokeWidth={2.5} dot={false} name={monthComparison.this_month_label} />
                                    <Line type="monotone" dataKey="last_month" stroke="#6b7280" strokeWidth={2} strokeDasharray="5 5" dot={false} name={monthComparison.last_month_label} />
                                    <Legend />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-52 flex items-center justify-center text-muted-foreground">No comparison data yet</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline + Agent Bifurcation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Upgrade Pipeline</CardTitle>
                                <CardDescription>Click any item to see student details</CardDescription>
                            </div>
                            <Badge variant="outline" className="text-amber-500 border-amber-500/40 font-mono">{formatCurrency(totalPipeline)}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {pipeline.length > 0 ? (
                            <div className="space-y-3">
                                {pipeline.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => drillPipelineItem(p)}>
                                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}20` }}>
                                            <Target className="h-4 w-4" style={{ color: COLORS[idx % COLORS.length] }} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{p.label}</p>
                                            <p className="text-xs text-muted-foreground">{p.count} students pitched</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-bold font-mono">{formatCurrency(p.revenue)}</p>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <Target className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-sm">No upgrades in pipeline</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Agent Bifurcation</CardTitle>
                        <CardDescription>Click any bar to see agent's student breakdown by stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {agentBifurcation.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={agentBifurcation}
                                    onClick={(e) => { if (e?.activePayload) drillBifurcationAgent(e.activePayload[0].payload); }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="agent_name" tick={{ className: 'fill-muted-foreground', fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                                    <YAxis tick={{ className: 'fill-muted-foreground', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="total_students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" cursor="pointer" />
                                    <Bar dataKey="activated" fill="#10b981" radius={[4, 4, 0, 0]} name="Activated" cursor="pointer" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-52 flex items-center justify-center text-muted-foreground">No agent data</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Drill-Down Modal */}
            <Dialog open={drillModal.open} onOpenChange={(o) => setDrillModal(prev => ({ ...prev, open: o }))}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="cs-drill-modal">
                    <DialogHeader>
                        <DialogTitle>{drillModal.title}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1">
                        {drillModal.loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}

                        {/* CS Agent Students */}
                        {!drillModal.loading && drillModal.type === 'cs_agent_students' && (
                            <>
                                <Badge variant="secondary" className="mb-3">{drillModal.data.length} students</Badge>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Code</TableHead><TableHead>Stage</TableHead><TableHead>Course</TableHead></TableRow></TableHeader>
                                    <TableBody>{drillModal.data.map((s, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{s.student_name}</TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">{s.student_code || '-'}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-xs">{s.stage?.replace(/_/g, ' ')}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground">{s.course_name}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                                {drillModal.data.length === 0 && <p className="text-center text-muted-foreground py-4">No students found</p>}
                            </>
                        )}

                        {/* CS Pipeline Detail */}
                        {!drillModal.loading && drillModal.type === 'cs_pipeline_detail' && drillModal.data?.agent_breakdown && (
                            <div className="space-y-4">
                                <Badge variant="outline" className="text-lg px-3 py-1">{drillModal.data.total} students</Badge>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Agent-wise Breakdown</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {drillModal.data.agent_breakdown.map((a, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70"
                                                onClick={() => drillAgentStudents(a.agent_name)}>
                                                <span className="text-sm font-medium truncate">{a.agent_name}</span>
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="secondary">{a.count}</Badge>
                                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Students</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Agent</TableHead><TableHead>Course</TableHead><TableHead>Pitched Package</TableHead></TableRow></TableHeader>
                                        <TableBody>{(drillModal.data.students || []).slice(0, 50).map((s, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{s.student_name}</TableCell>
                                                <TableCell className="text-muted-foreground">{s.cs_agent_name || 'Unassigned'}</TableCell>
                                                <TableCell className="text-muted-foreground">{s.course_name}</TableCell>
                                                <TableCell className="text-xs">{s.pitched_upgrade_label || '-'}</TableCell>
                                            </TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* CS Bifurcation Detail */}
                        {!drillModal.loading && drillModal.type === 'cs_bifurcation_detail' && drillModal.data?.stageGroups && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary">{drillModal.data.students.length} total students</Badge>
                                    <Badge variant="outline">SLA Rate: {drillModal.data.agent?.sla_rate || 0}%</Badge>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">By Stage</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                        {Object.entries(drillModal.data.stageGroups).map(([stage, students]) => (
                                            <div key={stage} className="p-3 rounded-lg bg-muted/50 text-center">
                                                <p className="text-lg font-bold">{students.length}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{stage.replace(/_/g, ' ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Stage</TableHead><TableHead>Course</TableHead></TableRow></TableHeader>
                                    <TableBody>{drillModal.data.students.slice(0, 50).map((s, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{s.student_name}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-xs">{s.stage?.replace(/_/g, ' ')}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground">{s.course_name}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CSDashboard;
