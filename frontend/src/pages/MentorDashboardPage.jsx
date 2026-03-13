import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Users, DollarSign, TrendingUp, CheckCircle, Clock, Wallet,
    GraduationCap, Phone, Target, Filter, ArrowUpRight,
} from 'lucide-react';

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'overall', label: 'Overall' },
];

function StatCard({ title, value, subtitle, icon, color }) {
    const Icon = icon;
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-500', green: 'bg-emerald-500/10 text-emerald-500',
        orange: 'bg-orange-500/10 text-orange-500', purple: 'bg-purple-500/10 text-purple-500',
        pink: 'bg-pink-500/10 text-pink-500', cyan: 'bg-cyan-500/10 text-cyan-500',
    };
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}><Icon className="h-6 w-6" /></div>
                </div>
            </CardContent>
        </Card>
    );
}

function MentorDashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [mentorBifurcation, setMentorBifurcation] = useState([]);
    const [period, setPeriod] = useState('overall');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDashboardData(); }, []);
    useEffect(() => { fetchMentorBifurcation(); }, [period]);

    async function loadDashboardData() {
        setLoading(true);
        try {
            const res = await apiClient.get('/mentor/dashboard');
            setData(res.data);
            fetchMentorBifurcation();
        } catch (err) {
            toast.error('Failed to load dashboard data');
        }
        setLoading(false);
    }

    async function fetchMentorBifurcation() {
        try {
            const res = await apiClient.get(`/dashboard/mentor-bifurcation?period=${period}`);
            setMentorBifurcation(res.data || []);
        } catch (err) {
            console.error('Failed to fetch mentor bifurcation:', err);
        }
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount || 0);

    if (loading) {
        return (<div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>);
    }

    const stats = data || { total_students: 0, total_revenue: 0, total_withdrawn: 0, current_net: 0, total_commission: 0, commission_received: 0, commission_balance: 0, upgrades_helped: 0, students_connected: 0, students_balance: 0, recent_activities: [], student_stages: {} };
    const connectionRate = stats.total_students > 0 ? Math.round((stats.students_connected / stats.total_students) * 100) : 0;
    const totalMentorStudents = mentorBifurcation.reduce((s, m) => s + m.total_students, 0);
    const totalRedeposits = mentorBifurcation.reduce((s, m) => s + (m.redeposit_amount || 0), 0);

    return (
        <div className="space-y-6" data-testid="mentor-dashboard-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GraduationCap className="h-8 w-8 text-orange-500" />
                        Mentor Dashboard
                    </h1>
                    <p className="text-muted-foreground">Welcome back, {user?.full_name}!</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px]" data-testid="mentor-period-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Badge className="bg-orange-500 text-white px-4 py-2 text-sm">{user?.role?.replace(/_/g, ' ').toUpperCase()}</Badge>
                </div>
            </div>

            {/* Student Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Students" value={stats.total_students} subtitle="Assigned to you" icon={Users} color="blue" />
                <StatCard title="Students Connected" value={stats.students_connected} subtitle={`${connectionRate}% connection rate`} icon={Phone} color="green" />
                <StatCard title="Pending Connection" value={stats.students_balance} subtitle="Need follow-up" icon={Clock} color="orange" />
                <StatCard title="Upgrades Helped" value={stats.upgrades_helped} subtitle="Successful upsells" icon={TrendingUp} color="purple" />
            </div>

            {/* Revenue Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" />Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Revenue Brought</p>
                                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(stats.total_revenue)}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Already Withdrawn</p>
                                <p className="text-2xl font-bold text-orange-500">{formatCurrency(stats.total_withdrawn)}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Current Net</p>
                                <p className="text-2xl font-bold text-blue-500">{formatCurrency(stats.current_net)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-purple-500" />Commission</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-semibold">{formatCurrency(stats.total_commission)}</span>
                            </div>
                            <Progress value={100} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Received</span>
                                <span className="font-semibold text-emerald-500">{formatCurrency(stats.commission_received)}</span>
                            </div>
                            <Progress value={stats.total_commission > 0 ? (stats.commission_received / stats.total_commission) * 100 : 0} className="h-2 bg-muted [&>div]:bg-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mentor Bifurcation - Students per Mentor with Redeposits */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-orange-500" />
                            <CardTitle>Mentor Bifurcation — Students & Redeposits</CardTitle>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary">{totalMentorStudents} students</Badge>
                            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{formatCurrency(totalRedeposits)} redeposits</Badge>
                        </div>
                    </div>
                    <CardDescription>Students assigned to each mentor with redeposit performance</CardDescription>
                </CardHeader>
                <CardContent>
                    {mentorBifurcation.length > 0 ? (
                        <div className="space-y-4">
                            {mentorBifurcation.map((mentor, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-muted/50 border border-border/50" data-testid={`mentor-row-${idx}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-sm">
                                                {mentor.mentor_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="font-semibold">{mentor.mentor_name}</p>
                                                <p className="text-xs text-muted-foreground">{mentor.total_students} students total</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold font-mono text-emerald-500">{formatCurrency(mentor.redeposit_amount)}</p>
                                            <p className="text-xs text-muted-foreground">{mentor.redeposits} redeposits</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="text-center p-2 rounded bg-blue-500/10">
                                            <p className="text-lg font-bold text-blue-500">{mentor.total_students}</p>
                                            <p className="text-[10px] text-muted-foreground">Total</p>
                                        </div>
                                        <div className="text-center p-2 rounded bg-yellow-500/10">
                                            <p className="text-lg font-bold text-yellow-500">{mentor.new_students}</p>
                                            <p className="text-[10px] text-muted-foreground">New</p>
                                        </div>
                                        <div className="text-center p-2 rounded bg-emerald-500/10">
                                            <p className="text-lg font-bold text-emerald-500">{mentor.connected}</p>
                                            <p className="text-[10px] text-muted-foreground">Connected</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">No mentor data for this period</div>
                    )}
                </CardContent>
            </Card>

            {/* Mentor Distribution Chart */}
            {mentorBifurcation.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Mentor Student Distribution</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={mentorBifurcation}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="mentor_name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                                <Bar dataKey="total_students" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Students" />
                                <Bar dataKey="redeposits" fill="#10b981" radius={[4, 4, 0, 0]} name="Redeposits" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Student Pipeline & Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-cyan-500" />Student Pipeline</CardTitle></CardHeader>
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
                    <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" />Recent Activities</CardTitle></CardHeader>
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
                                        </div>
                                        {activity.amount && <span className="text-sm font-semibold text-emerald-500">+{formatCurrency(activity.amount)}</span>}
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
