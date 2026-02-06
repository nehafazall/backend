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
    AreaChart,
    Area,
} from 'recharts';
import {
    Users,
    TrendingUp,
    Award,
    Target,
    CheckCircle,
    Clock,
    Star,
    AlertTriangle,
    ArrowUpRight,
    Headphones,
    GraduationCap,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4'];

const CSDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [studentFunnel, setStudentFunnel] = useState([]);
    const [upgradesByMonth, setUpgradesByMonth] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch dashboard stats
            const statsRes = await apiClient.get('/dashboard/stats');
            setStats(statsRes.data);
            
            // Fetch student funnel
            const funnelRes = await apiClient.get('/dashboard/student-funnel');
            if (funnelRes.data && Array.isArray(funnelRes.data)) {
                setStudentFunnel(funnelRes.data.map(item => ({
                    name: formatStageName(item._id),
                    value: item.count,
                })));
            }
            
            // Fetch upgrades by month
            const upgradesRes = await apiClient.get('/dashboard/upgrades-by-month');
            if (upgradesRes.data && Array.isArray(upgradesRes.data)) {
                setUpgradesByMonth(upgradesRes.data.map(item => ({
                    month: item._id,
                    upgrades: item.count,
                    revenue: item.revenue || 0,
                })));
            }
            
            // Fetch CS leaderboard
            const leaderRes = await apiClient.get('/dashboard/cs-leaderboard');
            if (leaderRes.data && Array.isArray(leaderRes.data)) {
                setLeaderboard(leaderRes.data);
            }
            
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
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

    const onboardingRate = stats.total_students > 0 
        ? Math.round((stats.onboarding_rate || 0))
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="cs-dashboard">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Service Dashboard</h1>
                    <p className="text-muted-foreground">
                        Your performance overview • {user?.full_name}
                    </p>
                </div>
                <Badge className="bg-primary text-white self-start text-sm px-4 py-2">
                    <Headphones className="h-4 w-4 mr-2" />
                    {formatStageName(user?.role)}
                </Badge>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Students</p>
                                <p className="text-3xl font-bold font-mono text-primary">
                                    {stats.total_students || 0}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.new_students || 0} new this month
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-primary/20">
                                <Users className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Upgrade Revenue</p>
                                <p className="text-3xl font-bold font-mono text-emerald-500">
                                    {formatCurrency(stats.upgrade_revenue)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.upgrade_closed || 0} upgrades closed
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/20">
                                <TrendingUp className="h-8 w-8 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Commission (This Month)</p>
                                <p className="text-3xl font-bold font-mono text-yellow-500">
                                    {formatCurrency(stats.upgrade_commission_current_month)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    From upgrades
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-yellow-500/20">
                                <Award className="h-8 w-8 text-yellow-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Satisfaction</p>
                                <p className="text-3xl font-bold font-mono">
                                    {stats.avg_satisfaction_score || 0}/5
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Based on surveys
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/20">
                                <Star className="h-8 w-8 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Onboarding Progress */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Target className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold">Onboarding Completion Rate</p>
                                <p className="text-sm text-muted-foreground">
                                    Students who completed onboarding
                                </p>
                            </div>
                        </div>
                        <span className="text-2xl font-bold font-mono">{onboardingRate}%</span>
                    </div>
                    <Progress value={onboardingRate} className="h-3" />
                </CardContent>
            </Card>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-2xl font-bold">{stats.activated_students || 0}</p>
                        <p className="text-sm text-muted-foreground">Activated</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{stats.new_students || 0}</p>
                        <p className="text-sm text-muted-foreground">Awaiting Onboarding</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <ArrowUpRight className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                        <p className="text-2xl font-bold">{stats.upgrade_eligible || 0}</p>
                        <p className="text-sm text-muted-foreground">Upgrade Eligible</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <GraduationCap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <p className="text-2xl font-bold">{stats.upgrade_pitched || 0}</p>
                        <p className="text-sm text-muted-foreground">Pitched for Upgrade</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student Funnel */}
                <Card>
                    <CardHeader>
                        <CardTitle>Student Pipeline</CardTitle>
                        <CardDescription>Students by stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {studentFunnel.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={studentFunnel} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#1f2937', 
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No student data
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upgrades by Month */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upgrade Trend</CardTitle>
                        <CardDescription>Monthly upgrade revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upgradesByMonth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={upgradesByMonth}>
                                    <defs>
                                        <linearGradient id="colorUpgrade" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip 
                                        formatter={(value, name) => [
                                            name === 'revenue' ? formatCurrency(value) : value,
                                            name === 'revenue' ? 'Revenue' : 'Upgrades'
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
                                        stroke="#10b981" 
                                        fillOpacity={1} 
                                        fill="url(#colorUpgrade)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No upgrade data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* CS Leaderboard */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <CardTitle>CS Team Leaderboard</CardTitle>
                    </div>
                    <CardDescription>Top performers by upgrade revenue</CardDescription>
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
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">{entry.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {entry.students} students • {entry.upgrades} upgrades
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-bold font-mono">
                                            {formatCurrency(entry.revenue)}
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                            {entry.onboarding_rate}% onboarding
                                        </p>
                                    </div>
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

export default CSDashboard;
