import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Users,
    DollarSign,
    TrendingUp,
    CheckCircle,
    Clock,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    GraduationCap,
    Phone,
    Target,
} from 'lucide-react';

function StatCard({ title, value, subtitle, icon, trend, trendUp, color }) {
    const Icon = icon;
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-500',
        green: 'bg-emerald-500/10 text-emerald-500',
        orange: 'bg-orange-500/10 text-orange-500',
        purple: 'bg-purple-500/10 text-purple-500',
        pink: 'bg-pink-500/10 text-pink-500',
        cyan: 'bg-cyan-500/10 text-cyan-500',
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                        {trend && (
                            <div className={`flex items-center gap-1 mt-2 text-sm ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trendUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                <span>{trend}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function MentorDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        setLoading(true);
        try {
            const res = await apiClient.get('/mentor/dashboard');
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load dashboard data');
            console.error(err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const stats = data || {
        total_students: 0,
        total_revenue: 0,
        total_withdrawn: 0,
        current_net: 0,
        total_commission: 0,
        commission_received: 0,
        commission_balance: 0,
        upgrades_helped: 0,
        students_connected: 0,
        students_balance: 0,
        recent_activities: [],
        student_stages: {},
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const connectionRate = stats.total_students > 0 
        ? Math.round((stats.students_connected / stats.total_students) * 100) 
        : 0;

    return (
        <div className="space-y-6" data-testid="mentor-dashboard-page">
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
                <Badge className="bg-orange-500 text-white px-4 py-2 text-sm">
                    {user?.role?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
            </div>

            {/* Student Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Students"
                    value={stats.total_students}
                    subtitle="Assigned to you"
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Students Connected"
                    value={stats.students_connected}
                    subtitle={`${connectionRate}% connection rate`}
                    icon={Phone}
                    color="green"
                />
                <StatCard
                    title="Pending Connection"
                    value={stats.students_balance}
                    subtitle="Need follow-up"
                    icon={Clock}
                    color="orange"
                />
                <StatCard
                    title="Upgrades Helped"
                    value={stats.upgrades_helped}
                    subtitle="Successful upsells"
                    icon={TrendingUp}
                    color="purple"
                />
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Revenue Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Revenue Brought</p>
                                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(stats.total_revenue)}</p>
                                <p className="text-xs text-muted-foreground">From student upgrades & redeposits</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Already Withdrawn</p>
                                <p className="text-2xl font-bold text-orange-500">{formatCurrency(stats.total_withdrawn)}</p>
                                <p className="text-xs text-muted-foreground">Paid out</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Current Net</p>
                                <p className="text-2xl font-bold text-blue-500">{formatCurrency(stats.current_net)}</p>
                                <p className="text-xs text-muted-foreground">Available balance</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-purple-500" />
                            Commission Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Total Earned</span>
                                <span className="font-semibold">{formatCurrency(stats.total_commission)}</span>
                            </div>
                            <Progress value={100} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Received</span>
                                <span className="font-semibold text-emerald-500">{formatCurrency(stats.commission_received)}</span>
                            </div>
                            <Progress 
                                value={stats.total_commission > 0 ? (stats.commission_received / stats.total_commission) * 100 : 0} 
                                className="h-2 bg-muted [&>div]:bg-emerald-500" 
                            />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Balance</span>
                                <span className="font-semibold text-orange-500">{formatCurrency(stats.commission_balance)}</span>
                            </div>
                            <Progress 
                                value={stats.total_commission > 0 ? (stats.commission_balance / stats.total_commission) * 100 : 0} 
                                className="h-2 bg-muted [&>div]:bg-orange-500" 
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Student Pipeline & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-cyan-500" />
                            Student Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { stage: 'New Student', count: stats.student_stages?.new_student || 0, color: 'bg-blue-500' },
                                { stage: 'Discussion Started', count: stats.student_stages?.discussion_started || 0, color: 'bg-purple-500' },
                                { stage: 'Pitched Redeposit', count: stats.student_stages?.pitched_for_redeposit || 0, color: 'bg-orange-500' },
                                { stage: 'Interested', count: stats.student_stages?.interested || 0, color: 'bg-yellow-500' },
                                { stage: 'Closed (Deposit)', count: stats.student_stages?.closed || 0, color: 'bg-emerald-500' },
                            ].map((item) => (
                                <div key={item.stage} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        <span className="text-sm">{item.stage}</span>
                                    </div>
                                    <Badge variant="secondary">{item.count}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            Recent Activities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.recent_activities?.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recent_activities.slice(0, 5).map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs font-medium">
                                            {activity.student_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{activity.student_name}</p>
                                            <p className="text-xs text-muted-foreground">{activity.action}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                                        </div>
                                        {activity.amount && (
                                            <span className="text-sm font-semibold text-emerald-500">
                                                +{formatCurrency(activity.amount)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No recent activities</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default MentorDashboardPage;
