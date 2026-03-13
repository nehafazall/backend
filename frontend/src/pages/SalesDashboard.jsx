import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PipelineRevenueWidget } from '@/components/PipelineRevenueWidget';
import { ExpectedCommissionWidget } from '@/components/ExpectedCommissionWidget';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, Treemap,
} from 'recharts';
import {
    DollarSign, TrendingUp, Users, Target, Award, AlertTriangle, Eye,
    CheckCircle, Clock, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
    CalendarDays, CreditCard, Zap,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const SalesDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({});
    const [leadFunnel, setLeadFunnel] = useState([]);
    const [salesByCourse, setSalesByCourse] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [topAgentsOverall, setTopAgentsOverall] = useState([]);
    const [topAgentsMonth, setTopAgentsMonth] = useState([]);
    const [todayTxns, setTodayTxns] = useState({ count: 0, total_amount: 0, transactions: [] });
    const [loading, setLoading] = useState(true);
    const [drillModal, setDrillModal] = useState({ open: false, title: '', data: [], type: '' });

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, funnelRes, courseRes, leaderRes, trendRes, overallRes, monthRes, todayRes] = await Promise.all([
                apiClient.get('/dashboard/stats'),
                apiClient.get('/dashboard/lead-funnel'),
                apiClient.get('/dashboard/sales-by-course'),
                apiClient.get('/dashboard/leaderboard'),
                apiClient.get('/dashboard/monthly-trend'),
                apiClient.get('/dashboard/sales-agent-closings?period=overall&limit=10'),
                apiClient.get('/dashboard/sales-agent-closings?period=this_month&limit=5'),
                apiClient.get('/dashboard/today-transactions'),
            ]);
            setStats(statsRes.data);
            setLeadFunnel(funnelRes.data.map(item => ({ name: formatStageName(item._id), value: item.count, stage: item._id })));
            // Group courses with small values into "Others"
            const rawCourses = courseRes.data.map(item => ({
                name: item.course_name || 'Unknown',
                sales: item.count, revenue: item.revenue || 0,
            })).sort((a, b) => b.revenue - a.revenue);
            const top8 = rawCourses.slice(0, 8);
            const others = rawCourses.slice(8);
            if (others.length > 0) {
                top8.push({
                    name: `Others (${others.length})`,
                    sales: others.reduce((s, c) => s + c.sales, 0),
                    revenue: others.reduce((s, c) => s + c.revenue, 0),
                });
            }
            setSalesByCourse(top8.map((c, i) => ({ ...c, fill: COLORS[i % COLORS.length] })));
            setLeaderboard(leaderRes.data);
            setMonthlyTrend(trendRes.data.map(item => ({ month: item._id, deals: item.deals, revenue: item.revenue })));
            setTopAgentsOverall(overallRes.data || []);
            setTopAgentsMonth(monthRes.data || []);
            setTodayTxns(todayRes.data || { count: 0, total_amount: 0, transactions: [] });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatStageName = (stage) => stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
    const formatCurrency = (amount) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount || 0);

    const openDrillDown = (title, data, type) => setDrillModal({ open: true, title, data, type });

    const targetProgress = stats.monthly_target > 0 ? Math.min((stats.total_revenue / stats.monthly_target) * 100, 100) : 0;

    if (loading) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    return (
        <div className="space-y-6" data-testid="sales-dashboard">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
                    <p className="text-muted-foreground">Performance overview & analytics</p>
                </div>
                <Badge className="bg-primary text-white self-start text-sm px-4 py-2">{formatStageName(user?.role)}</Badge>
            </div>

            {/* Key Metrics - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate('/sales')} data-testid="metric-total-revenue">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold font-mono text-primary">{formatCurrency(stats.total_revenue)}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">{stats.enrolled_total || 0} deals closed <ArrowUpRight className="h-3 w-3" /></p>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/20"><DollarSign className="h-8 w-8 text-primary" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => openDrillDown('Monthly Leaderboard', leaderboard, 'leaderboard')}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Commission (This Month)</p>
                                <p className="text-3xl font-bold font-mono text-emerald-500">{formatCurrency(stats.commission_current_month)}</p>
                                <p className="text-xs text-muted-foreground mt-1">All-time: {formatCurrency(stats.commission_all_time)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/20"><Award className="h-8 w-8 text-emerald-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => openDrillDown('Lead Pipeline', leadFunnel, 'funnel')}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                <p className="text-3xl font-bold font-mono">{stats.conversion_rate || 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Avg deal: {formatCurrency(stats.avg_deal_size)} <ArrowUpRight className="h-3 w-3" /></p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/20"><TrendingUp className="h-8 w-8 text-blue-500" /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate('/sales')}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Leads</p>
                                <p className="text-3xl font-bold font-mono">{stats.total_leads || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">{stats.hot_leads || 0} hot leads</p>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/20"><Users className="h-8 w-8 text-orange-500" /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Transactions */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent" data-testid="today-transactions">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            <CardTitle>Today's Transactions</CardTitle>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="text-lg px-3 py-1">{todayTxns.count} deals</Badge>
                            <Badge className="bg-emerald-500 text-white text-lg px-3 py-1">{formatCurrency(todayTxns.total_amount)}</Badge>
                        </div>
                    </div>
                </CardHeader>
                {todayTxns.transactions?.length > 0 && (
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {todayTxns.transactions.slice(0, 6).map((txn, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background border" data-testid={`today-txn-${idx}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <CreditCard className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium truncate max-w-[150px]">{txn.student_name}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{txn.course_name}</p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-500">{formatCurrency(txn.amount)}</span>
                                </div>
                            ))}
                        </div>
                        {todayTxns.transactions.length > 6 && (
                            <Button variant="ghost" className="w-full mt-2 text-primary" onClick={() => openDrillDown("Today's Transactions", todayTxns.transactions, 'transactions')}>
                                View all {todayTxns.transactions.length} transactions
                            </Button>
                        )}
                    </CardContent>
                )}
                {(!todayTxns.transactions || todayTxns.transactions.length === 0) && (
                    <CardContent><p className="text-center text-muted-foreground py-4">No transactions yet today</p></CardContent>
                )}
            </Card>

            {/* Top Agents Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="cursor-pointer" onClick={() => openDrillDown('Top 10 Agents — Overall', topAgentsOverall, 'agents')}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-500" />
                            <CardTitle>Top 10 Agents — Overall</CardTitle>
                        </div>
                        <CardDescription>Total closings across all time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topAgentsOverall.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={topAgentsOverall} layout="vertical" margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="agent_name" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} width={120} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? formatCurrency(v) : v, n]}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="closings" fill="#EF3340" radius={[0, 6, 6, 0]} name="Closings" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No data yet</div>)}
                    </CardContent>
                </Card>

                <Card className="cursor-pointer" onClick={() => openDrillDown('Top 5 Agents — This Month', topAgentsMonth, 'agents')}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-emerald-500" />
                            <CardTitle>Top 5 Agents — This Month</CardTitle>
                        </div>
                        <CardDescription>Best performers this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topAgentsMonth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={topAgentsMonth} margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis dataKey="agent_name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip formatter={(v, n) => [n === 'Revenue' ? formatCurrency(v) : v, n]}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="closings" fill="#10b981" radius={[6, 6, 0, 0]} name="Closings" />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No closings this month yet</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Trend + Sales by Course */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <CardTitle>Monthly Revenue Trend</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={monthlyTrend}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF3340" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#EF3340" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <Tooltip formatter={(v, n) => [n === 'revenue' ? formatCurrency(v) : v, n === 'revenue' ? 'Revenue' : 'Deals']}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#EF3340" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                                    <Area yAxisId="right" type="monotone" dataKey="deals" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDeals)" name="Deals" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No trend data</div>)}
                    </CardContent>
                </Card>

                <Card className="cursor-pointer" onClick={() => openDrillDown('Sales by Course', salesByCourse, 'courses')}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" />
                            <CardTitle>Sales by Course</CardTitle>
                        </div>
                        <CardDescription>Revenue distribution across courses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {salesByCourse.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={salesByCourse} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="revenue"
                                        label={({ name, percent }) => percent > 0.05 ? `${name.substring(0, 12)}` : ''} labelLine={false}>
                                        {salesByCourse.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />))}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No sales data</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="cursor-pointer" onClick={() => navigate('/sales')}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle>Lead Pipeline</CardTitle>
                        </div>
                        <CardDescription>Click to view Sales CRM</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leadFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={leadFunnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {leadFunnel.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (<div className="h-64 flex items-center justify-center text-muted-foreground">No lead data</div>)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-500" />
                                <CardTitle>Monthly Leaderboard</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => openDrillDown('Full Leaderboard', leaderboard, 'leaderboard')}>
                                <Eye className="h-4 w-4 mr-1" />View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {leaderboard.length > 0 ? (
                            <div className="space-y-3">
                                {leaderboard.slice(0, 5).map((entry, index) => (
                                    <div key={entry.user_id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${entry.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-gray-400 text-black' : index === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{entry.name}</p>
                                                <p className="text-xs text-muted-foreground">{entry.deals} deals</p>
                                            </div>
                                        </div>
                                        <span className="text-base font-bold font-mono">{formatCurrency(entry.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="text-center text-muted-foreground py-8">No leaderboard data yet</div>)}
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline Revenue & Commission Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineRevenueWidget />
                <ExpectedCommissionWidget />
            </div>

            {/* Drill-down Modal */}
            <Dialog open={drillModal.open} onOpenChange={(o) => setDrillModal({ ...drillModal, open: o })}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>{drillModal.title}</DialogTitle>
                    </DialogHeader>
                    {drillModal.type === 'agents' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead className="text-right">Closings</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillModal.data.map((a, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-bold">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{a.agent_name}</TableCell>
                                        <TableCell className="text-right">{a.closings}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(a.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {drillModal.type === 'leaderboard' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Deals</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillModal.data.map((e) => (
                                    <TableRow key={e.user_id}>
                                        <TableCell className="font-bold">{e.rank}</TableCell>
                                        <TableCell className="font-medium">{e.name}</TableCell>
                                        <TableCell><Badge variant="secondary">{formatStageName(e.role)}</Badge></TableCell>
                                        <TableCell className="text-right">{e.deals}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(e.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {drillModal.type === 'transactions' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillModal.data.map((t, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{t.student_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{t.course_name}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(t.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {drillModal.type === 'courses' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-right">Sales</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillModal.data.map((c, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell className="text-right">{c.sales}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{formatCurrency(c.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {drillModal.type === 'funnel' && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Stage</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillModal.data.map((f, i) => (
                                    <TableRow key={i} className="cursor-pointer hover:bg-muted" onClick={() => { setDrillModal({ ...drillModal, open: false }); navigate('/sales'); }}>
                                        <TableCell className="font-medium">{f.name}</TableCell>
                                        <TableCell className="text-right font-bold">{f.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesDashboard;
