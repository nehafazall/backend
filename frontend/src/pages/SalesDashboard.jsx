import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line,
    AreaChart,
    Area,
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    Users,
    Target,
    Award,
    AlertTriangle,
    CheckCircle,
    Clock,
    BarChart3,
    PieChart as PieChartIcon,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];

const SalesDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [leadFunnel, setLeadFunnel] = useState([]);
    const [salesByCourse, setSalesByCourse] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, funnelRes, courseRes, leaderRes, trendRes] = await Promise.all([
                apiClient.get('/dashboard/stats'),
                apiClient.get('/dashboard/lead-funnel'),
                apiClient.get('/dashboard/sales-by-course'),
                apiClient.get('/dashboard/leaderboard'),
                apiClient.get('/dashboard/monthly-trend'),
            ]);
            
            setStats(statsRes.data);
            setLeadFunnel(funnelRes.data.map(item => ({
                name: formatStageName(item._id),
                value: item.count,
            })));
            setSalesByCourse(courseRes.data.map((item, i) => ({
                name: item.course_name || 'Unknown',
                sales: item.count,
                revenue: item.revenue || 0,
                fill: COLORS[i % COLORS.length],
            })));
            setLeaderboard(leaderRes.data);
            setMonthlyTrend(trendRes.data.map(item => ({
                month: item._id,
                deals: item.deals,
                revenue: item.revenue,
            })));
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatStageName = (stage) => {
        return stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const targetProgress = stats.monthly_target > 0 
        ? Math.min((stats.total_revenue / stats.monthly_target) * 100, 100)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="sales-dashboard">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
                    <p className="text-muted-foreground">
                        Your performance overview • {user?.full_name}
                    </p>
                </div>
                <Badge className="bg-primary text-white self-start text-sm px-4 py-2">
                    {formatStageName(user?.role)}
                </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold font-mono text-primary">
                                    {formatCurrency(stats.total_revenue)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.enrolled_total || 0} deals closed
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/20">
                                <DollarSign className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Commission (This Month)</p>
                                <p className="text-3xl font-bold font-mono text-emerald-500">
                                    {formatCurrency(stats.commission_current_month)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    All-time: {formatCurrency(stats.commission_all_time)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/20">
                                <Award className="h-8 w-8 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                <p className="text-3xl font-bold font-mono">
                                    {stats.conversion_rate || 0}%
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Avg deal: {formatCurrency(stats.avg_deal_size)}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/20">
                                <TrendingUp className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Leads</p>
                                <p className="text-3xl font-bold font-mono">
                                    {stats.total_leads || 0}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.hot_leads || 0} hot leads
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/20">
                                <Users className="h-8 w-8 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Target Progress */}
            {stats.monthly_target > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold">Monthly Target Progress</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(stats.total_revenue)} of {formatCurrency(stats.monthly_target)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-2xl font-bold font-mono">{targetProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={targetProgress} className="h-3" />
                    </CardContent>
                </Card>
            )}

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-2xl font-bold">{stats.enrolled_today || 0}</p>
                        <p className="text-sm text-muted-foreground">Enrolled Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{stats.leads_today || 0}</p>
                        <p className="text-sm text-muted-foreground">New Leads Today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                        <p className="text-2xl font-bold">{stats.hot_leads || 0}</p>
                        <p className="text-sm text-muted-foreground">Hot Leads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${stats.sla_breaches > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                        <p className="text-2xl font-bold">{stats.sla_breaches || 0}</p>
                        <p className="text-sm text-muted-foreground">SLA Breaches</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Funnel */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle>Lead Pipeline</CardTitle>
                        </div>
                        <CardDescription>Leads by stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leadFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={leadFunnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1f2937', 
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#EF3340" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No lead data
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sales by Course */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" />
                            <CardTitle>Sales by Course</CardTitle>
                        </div>
                        <CardDescription>Revenue distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {salesByCourse.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={salesByCourse}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="revenue"
                                    >
                                        {salesByCourse.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => formatCurrency(value)}
                                        contentStyle={{ 
                                            backgroundColor: '#1f2937', 
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No sales data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                    <CardDescription>Performance over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                    {monthlyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF3340" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#EF3340" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip 
                                    formatter={(value, name) => [
                                        name === 'revenue' ? formatCurrency(value) : value,
                                        name === 'revenue' ? 'Revenue' : 'Deals'
                                    ]}
                                    contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#EF3340" 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            No trend data
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <CardTitle>Sales Leaderboard</CardTitle>
                    </div>
                    <CardDescription>Top performers this month</CardDescription>
                </CardHeader>
                <CardContent>
                    {leaderboard.length > 0 ? (
                        <div className="space-y-4">
                            {leaderboard.map((entry, index) => (
                                <div 
                                    key={entry.user_id}
                                    className={`flex items-center justify-between p-4 rounded-lg ${
                                        entry.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                            index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-gray-400 text-black' :
                                            index === 2 ? 'bg-orange-600 text-white' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {entry.rank}
                                        </div>
                                        <div>
                                            <p className="font-medium">{entry.name}</p>
                                            <p className="text-xs text-muted-foreground">{entry.deals} deals</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold font-mono">
                                        {formatCurrency(entry.revenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No leaderboard data yet
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SalesDashboard;
