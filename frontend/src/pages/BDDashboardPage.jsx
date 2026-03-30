import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CallAnalyticsWidget from '@/components/CallAnalyticsWidget';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    Users, DollarSign, TrendingUp, CheckCircle, Briefcase, ArrowUpRight,
} from 'lucide-react';

const PERIOD_OPTIONS = [
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];

const STAGE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#84cc16', '#10b981'];
const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

function StatCard({ title, value, subtitle, icon: Icon, colorClass = 'bg-sky-500/10 text-sky-500' }) {
    return (
        <Card data-testid={`bd-dash-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

export default function BDDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('this_month');
    const [bdAgents, setBdAgents] = useState([]);
    const [filterAgent, setFilterAgent] = useState('all');

    const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role);

    useEffect(() => {
        fetchDashboard();
    }, [period, filterAgent]);

    useEffect(() => {
        if (isSuperAdmin) {
            apiClient.get('/bd/agents').then(r => setBdAgents(r.data || [])).catch(() => {});
        }
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const params = { period };
            if (filterAgent !== 'all') params.bd_agent_id = filterAgent;
            const res = await apiClient.get('/bd/dashboard', { params });
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load BD dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center py-20" data-testid="bd-dashboard-loading">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    const stageData = Object.entries(data.stage_counts || {}).map(([stage, count], i) => ({
        name: stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        count,
        fill: STAGE_COLORS[i % STAGE_COLORS.length],
    }));

    const agentPerf = data.agent_performance || [];

    return (
        <div className="space-y-6" data-testid="bd-dashboard-page">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Business Development Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Redeposit performance and student pipeline</p>
                    <div className="mt-1"><CallAnalyticsWidget compact /></div>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[160px]" data-testid="bd-dash-period-select">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isSuperAdmin && bdAgents.length > 0 && (
                        <Select value={filterAgent} onValueChange={setFilterAgent}>
                            <SelectTrigger className="w-[180px]" data-testid="bd-dash-agent-filter">
                                <SelectValue placeholder="All BD Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All BD Agents</SelectItem>
                                {bdAgents.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className={`grid grid-cols-2 ${isSuperAdmin ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
                <StatCard title="Total Students" value={data.total_students} icon={Users} colorClass="bg-sky-500/10 text-sky-500" />
                <StatCard title="Closed Deals" value={data.stage_counts?.closed || 0} icon={CheckCircle} colorClass="bg-lime-500/10 text-lime-500" />
                {isSuperAdmin && (
                    <>
                        <StatCard title="Period Revenue" value={fmtAED(data.period_revenue)} subtitle={`${data.period_deposits} deposits`}
                            icon={DollarSign} colorClass="bg-emerald-500/10 text-emerald-500" />
                        <StatCard title="All-Time Revenue" value={fmtAED(data.all_time_revenue)} icon={TrendingUp} colorClass="bg-violet-500/10 text-violet-500" />
                    </>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Pipeline Chart */}
                <Card data-testid="bd-dash-pipeline-chart">
                    <CardHeader>
                        <CardTitle className="text-base">Pipeline Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={stageData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {stageData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Stage Distribution Pie */}
                <Card data-testid="bd-dash-stage-pie">
                    <CardHeader>
                        <CardTitle className="text-base">Stage Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={stageData.filter(s => s.count > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                    paddingAngle={3} dataKey="count" nameKey="name" label={({ name, count }) => `${name}: ${count}`}>
                                    {stageData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Performance Table (Super Admin) */}
            {isSuperAdmin && agentPerf.length > 0 && (
                <Card data-testid="bd-dash-agent-perf">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Agent Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Agent</TableHead>
                                    <TableHead className="text-right">Deposits</TableHead>
                                    <TableHead className="text-right">Revenue (AED)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agentPerf.map((a, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{a.name || 'Unknown'}</TableCell>
                                        <TableCell className="text-right">{a.deposits}</TableCell>
                                        <TableCell className="text-right font-mono">{fmtAED(a.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Recent Deposits - Super Admin only */}
            {isSuperAdmin && (
            <Card data-testid="bd-dash-recent-deposits">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Recent Redeposits
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(data.recent_deposits || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No redeposits in this period</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount (AED)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data.recent_deposits || []).map((d, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{d.name}</TableCell>
                                        <TableCell>{d.agent || 'N/A'}</TableCell>
                                        <TableCell>{d.date}</TableCell>
                                        <TableCell className="text-right font-mono">{fmtAED(d.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            )}
        </div>
    );
}
