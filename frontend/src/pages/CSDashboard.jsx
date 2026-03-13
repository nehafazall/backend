import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
    Users, TrendingUp, Award, Target, CheckCircle, Clock, Star,
    AlertTriangle, ArrowUpRight, Headphones, GraduationCap, Filter, ShieldCheck,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];

const CSDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [studentFunnel, setStudentFunnel] = useState([]);
    const [upgradesByMonth, setUpgradesByMonth] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [agentBifurcation, setAgentBifurcation] = useState([]);
    const [period, setPeriod] = useState('overall');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDashboardData(); }, []);
    useEffect(() => { fetchAgentBifurcation(); }, [period]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, funnelRes, upgradesRes, leaderRes] = await Promise.all([
                apiClient.get('/dashboard/stats'),
                apiClient.get('/dashboard/student-funnel'),
                apiClient.get('/dashboard/upgrades-by-month'),
                apiClient.get('/dashboard/cs-leaderboard'),
            ]);
            setStats(statsRes.data);
            if (funnelRes.data && Array.isArray(funnelRes.data)) {
                setStudentFunnel(funnelRes.data.map(item => ({ name: formatStageName(item._id), value: item.count })));
            }
            if (upgradesRes.data && Array.isArray(upgradesRes.data)) {
                setUpgradesByMonth(upgradesRes.data.map(item => ({ month: item._id, upgrades: item.count, revenue: item.revenue || 0 })));
            }
            if (leaderRes.data && Array.isArray(leaderRes.data)) { setLeaderboard(leaderRes.data); }
            fetchAgentBifurcation();
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgentBifurcation = async () => {
        try {
            const res = await apiClient.get(`/dashboard/cs-agent-bifurcation?period=${period}`);
            setAgentBifurcation(res.data || []);
        } catch (err) {
            console.error('Failed to fetch CS agent bifurcation:', err);
        }
    };

    const formatStageName = (stage) => stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
    const formatCurrency = (amount) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount || 0);

    if (loading) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    const totalAgentStudents = agentBifurcation.reduce((s, a) => s + a.total_students, 0);

    return (
        <div className="space-y-6" data-testid="cs-dashboard">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Service Dashboard</h1>
                    <p className="text-muted-foreground">Performance overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px]" data-testid="cs-period-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Badge className="bg-primary text-white text-sm px-4 py-2">
                        <Headphones className="h-4 w-4 mr-2" />{formatStageName(user?.role)}
                    </Badge>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Students</p>
                                <p className="text-3xl font-bold font-mono text-primary">{stats.total_students || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats.new_students || 0} new this month</p>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/20"><Users className="h-8 w-8 text-primary" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Activated</p>
                                <p className="text-3xl font-bold font-mono text-emerald-500">{stats.activated_students || 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/20"><CheckCircle className="h-8 w-8 text-emerald-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Upgrade Revenue</p>
                                <p className="text-3xl font-bold font-mono text-blue-500">{formatCurrency(stats.upgrade_revenue)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/20"><TrendingUp className="h-8 w-8 text-blue-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                                <p className="text-3xl font-bold font-mono">{stats.avg_satisfaction_score || 0}/5</p>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-500/20"><Star className="h-8 w-8 text-yellow-500" /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Bifurcation - Students per CS Agent with SLA Rates */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <CardTitle>CS Agent Bifurcation — Students & SLA</CardTitle>
                        </div>
                        <Badge variant="secondary">{totalAgentStudents} total students</Badge>
                    </div>
                    <CardDescription>Students assigned to each CS agent with SLA compliance rates</CardDescription>
                </CardHeader>
                <CardContent>
                    {agentBifurcation.length > 0 ? (
                        <div className="space-y-4">
                            {agentBifurcation.map((agent, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-border/50" data-testid={`cs-agent-row-${idx}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                {agent.agent_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{agent.agent_name}</p>
                                                <p className="text-xs text-muted-foreground">{agent.total_students} students • {agent.activated} activated</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold font-mono">{agent.sla_rate}%</p>
                                            <p className="text-xs text-muted-foreground">SLA Rate</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        <div className="text-center p-2 rounded bg-emerald-500/10">
                                            <p className="text-lg font-bold text-emerald-500">{agent.sla_ok}</p>
                                            <p className="text-[10px] text-muted-foreground">SLA OK</p>
                                        </div>
                                        <div className="text-center p-2 rounded bg-yellow-500/10">
                                            <p className="text-lg font-bold text-yellow-500">{agent.sla_warning}</p>
                                            <p className="text-[10px] text-muted-foreground">Warning</p>
                                        </div>
                                        <div className="text-center p-2 rounded bg-red-500/10">
                                            <p className="text-lg font-bold text-red-500">{agent.sla_breach}</p>
                                            <p className="text-[10px] text-muted-foreground">Breach</p>
                                        </div>
                                        <div className="text-center p-2 rounded bg-blue-500/10">
                                            <p className="text-lg font-bold text-blue-500">{agent.total_students}</p>
                                            <p className="text-[10px] text-muted-foreground">Total</p>
                                        </div>
                                    </div>
                                    <Progress value={agent.sla_rate} className="h-1.5 mt-2" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">No agent data for this period</div>
                    )}
                </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Student Pipeline</CardTitle></CardHeader>
                    <CardContent>
                        {studentFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={studentFunnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">No student data</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Agent Student Distribution</CardTitle></CardHeader>
                    <CardContent>
                        {agentBifurcation.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={agentBifurcation}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="agent_name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                                    <Bar dataKey="total_students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Students" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CSDashboard;
