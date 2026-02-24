import React, { useState, useEffect } from 'react';
import { useAuth, dashboardApi, leadApi, studentApi, paymentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'recharts';
import {
    Users,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Clock,
    Phone,
    GraduationCap,
    Target,
    Percent,
    Star,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
    Building2,
    CalendarDays,
} from 'lucide-react';

const STAGE_COLORS = {
    new_lead: '#3b82f6',
    no_answer: '#f97316',
    call_back: '#8b5cf6',
    warm_lead: '#eab308',
    hot_lead: '#f97316',
    in_progress: '#06b6d4',
    rejected: '#ef4444',
    enrolled: '#10b981',
};

const PAYMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const StatCard = ({ title, value, icon: Icon, description, trend, loading, valueColor }) => (
    <Card className="stat-card" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <CardContent className="p-6">
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className={`stat-card-value mt-2 ${valueColor || ''}`}>{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-emerald-500/10' : trend === 'down' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                        <Icon className={`h-6 w-6 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
);

const DashboardPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [leadFunnel, setLeadFunnel] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState([]);
    const [recentLeads, setRecentLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            const [statsRes, funnelRes, paymentRes, leadsRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getLeadFunnel(),
                dashboardApi.getPaymentSummary(),
                leadApi.getAll({ limit: 5 }),
            ]);
            
            setStats(statsRes.data);
            setLeadFunnel(funnelRes.data.map(item => ({
                name: formatStageName(item._id),
                value: item.count,
                fill: STAGE_COLORS[item._id] || '#6b7280',
            })));
            setPaymentSummary(paymentRes.data.map((item, index) => ({
                name: item._id?.toUpperCase() || 'OTHER',
                value: item.total || 0,
                count: item.count || 0,
                fill: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
            })));
            setRecentLeads(leadsRes.data.slice(0, 5));
            
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

    const isSalesRole = ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'].includes(user?.role);
    const isCSRole = ['super_admin', 'admin', 'cs_head', 'cs_agent'].includes(user?.role);
    const isMentorRole = ['super_admin', 'admin', 'mentor', 'academic_master'].includes(user?.role);
    const isFinanceRole = ['super_admin', 'admin', 'finance', 'finance_manager'].includes(user?.role);
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);

    return (
        <div className="space-y-6" data-testid="dashboard-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user?.full_name}! Here's your overview.
                    </p>
                </div>
                <Badge className="bg-blue-600 text-white self-start">
                    {formatStageName(user?.role)}
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isSalesRole && (
                    <>
                        <StatCard
                            title="Total Leads"
                            value={stats.total_leads || 0}
                            icon={Users}
                            description={`${stats.leads_today || 0} new today`}
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="Hot Leads"
                            value={stats.hot_leads || 0}
                            icon={TrendingUp}
                            description="Ready to convert"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="Enrolled Today"
                            value={stats.enrolled_today || 0}
                            icon={CheckCircle}
                            description="Successful conversions"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="SLA Breaches"
                            value={stats.sla_breaches || 0}
                            icon={AlertTriangle}
                            description="Requires attention"
                            trend={stats.sla_breaches > 0 ? 'down' : 'up'}
                            loading={loading}
                        />
                    </>
                )}
                
                {isCSRole && (
                    <>
                        <StatCard
                            title="Total Students"
                            value={stats.total_students || 0}
                            icon={GraduationCap}
                            description="Active enrollments"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="New Students"
                            value={stats.new_students || 0}
                            icon={Users}
                            description="Awaiting onboarding"
                            loading={loading}
                        />
                        <StatCard
                            title="Activated"
                            value={stats.activated_students || 0}
                            icon={CheckCircle}
                            description="Ready for classes"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="Upgrade Eligible"
                            value={stats.upgrade_eligible || 0}
                            icon={TrendingUp}
                            description="6+ classes completed"
                            loading={loading}
                        />
                    </>
                )}
                
                {isFinanceRole && (
                    <>
                        <StatCard
                            title="Total Revenue"
                            value={formatCurrency(stats.total_revenue)}
                            icon={DollarSign}
                            description="Verified payments"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="Pending Payments"
                            value={stats.pending_payments || 0}
                            icon={Clock}
                            description="Awaiting verification"
                            loading={loading}
                        />
                        <StatCard
                            title="Verified"
                            value={stats.verified_payments || 0}
                            icon={CheckCircle}
                            description="Ready for reconciliation"
                            trend="up"
                            loading={loading}
                        />
                        <StatCard
                            title="Discrepancies"
                            value={stats.discrepancies || 0}
                            icon={AlertTriangle}
                            description="Requires review"
                            trend={stats.discrepancies > 0 ? 'down' : 'up'}
                            loading={loading}
                        />
                    </>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Funnel Chart */}
                {isSalesRole && (
                    <Card data-testid="lead-funnel-chart">
                        <CardHeader>
                            <CardTitle>Lead Funnel</CardTitle>
                            <CardDescription>Distribution by stage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-64 w-full" />
                            ) : leadFunnel.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={leadFunnel} layout="horizontal">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1e293b', 
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                            }}
                                            labelStyle={{ color: '#f8fafc' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {leadFunnel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    No lead data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Payment Summary Chart */}
                {isFinanceRole && (
                    <Card data-testid="payment-summary-chart">
                        <CardHeader>
                            <CardTitle>Payment Methods</CardTitle>
                            <CardDescription>Revenue by payment method</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-64 w-full" />
                            ) : paymentSummary.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={paymentSummary}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {paymentSummary.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{ 
                                                backgroundColor: '#1e293b', 
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    No payment data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Recent Activity */}
            {isSalesRole && (
                <Card data-testid="recent-leads">
                    <CardHeader>
                        <CardTitle>Recent Leads</CardTitle>
                        <CardDescription>Latest lead activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : recentLeads.length > 0 ? (
                            <div className="space-y-4">
                                {recentLeads.map((lead) => (
                                    <div 
                                        key={lead.id}
                                        className={`p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors stage-${lead.stage}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{lead.full_name}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Phone className="h-3 w-3" />
                                                    {lead.phone}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={lead.stage === 'enrolled' ? 'default' : 'secondary'}>
                                                    {formatStageName(lead.stage)}
                                                </Badge>
                                                {lead.sla_breach && (
                                                    <Badge className="ml-2 bg-red-500 text-white">
                                                        SLA Breach
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No recent leads
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default DashboardPage;
