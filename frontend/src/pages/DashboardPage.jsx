import React, { useState, useEffect } from 'react';
import { useAuth, dashboardApi, leadApi, studentApi, paymentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ESSSection from '@/components/ess/ESSSection';
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
    Eye,
    UserCircle,
    X,
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
    
    // View As feature
    const [viewableUsers, setViewableUsers] = useState([]);
    const [viewAsUserId, setViewAsUserId] = useState(null);
    const [viewingAs, setViewingAs] = useState(null);
    const [canViewOthers, setCanViewOthers] = useState(false);

    useEffect(() => {
        fetchViewableUsers();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [viewAsUserId]);

    const fetchViewableUsers = async () => {
        try {
            const res = await dashboardApi.getViewableUsers();
            setViewableUsers(res.data.users || []);
            setCanViewOthers(res.data.can_view_others || false);
        } catch (error) {
            console.error('Failed to fetch viewable users:', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            const [statsRes, funnelRes, paymentRes, leadsRes] = await Promise.all([
                dashboardApi.getStats(viewAsUserId),
                dashboardApi.getLeadFunnel(viewAsUserId),
                dashboardApi.getPaymentSummary(viewAsUserId),
                leadApi.getAll({ limit: 5 }),
            ]);
            
            setStats(statsRes.data);
            setViewingAs(statsRes.data.viewing_as || null);
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

    const handleViewAsChange = (userId) => {
        if (userId === 'self') {
            setViewAsUserId(null);
            setViewingAs(null);
        } else {
            setViewAsUserId(userId);
        }
    };

    const clearViewAs = () => {
        setViewAsUserId(null);
        setViewingAs(null);
    };

    // Group users by role for the dropdown
    const groupedUsers = viewableUsers.reduce((acc, u) => {
        const role = u.role || 'unknown';
        if (!acc[role]) acc[role] = [];
        acc[role].push(u);
        return acc;
    }, {});

    const formatRoleName = (role) => {
        return role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
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
            {/* Viewing As Banner */}
            {viewingAs && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-amber-500" />
                        <div>
                            <p className="font-medium text-amber-700">
                                Viewing Dashboard As: <span className="font-bold">{viewingAs.full_name}</span>
                            </p>
                            <p className="text-sm text-amber-600">
                                {formatRoleName(viewingAs.role)} • {viewingAs.email}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearViewAs} className="border-amber-500 text-amber-700 hover:bg-amber-500/10">
                        <X className="h-4 w-4 mr-1" /> Back to My Dashboard
                    </Button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {viewingAs ? `${viewingAs.full_name}'s Dashboard` : 'Dashboard'}
                    </h1>
                    <p className="text-muted-foreground">
                        {viewingAs 
                            ? `Viewing ${viewingAs.full_name}'s performance and statistics`
                            : `Welcome back, ${user?.full_name}! Here's your overview.`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View As Selector */}
                    {canViewOthers && viewableUsers.length > 0 && (
                        <Select value={viewAsUserId || 'self'} onValueChange={handleViewAsChange}>
                            <SelectTrigger className="w-[250px]" data-testid="view-as-selector">
                                <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="View as..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="self">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">My Dashboard</span>
                                    </div>
                                </SelectItem>
                                {Object.entries(groupedUsers).map(([role, users]) => (
                                    <SelectGroup key={role}>
                                        <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                                            {formatRoleName(role)}
                                        </SelectLabel>
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                <div className="flex flex-col">
                                                    <span>{u.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Badge className="bg-blue-600 text-white">
                        {formatRoleName(viewingAs?.role || user?.role)}
                    </Badge>
                </div>
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
                            value={formatCurrency(stats.total_verified_revenue || stats.total_revenue)}
                            icon={DollarSign}
                            description="Verified payments"
                            trend="up"
                            loading={loading}
                            valueColor="text-emerald-500"
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

            {/* Extended Quick Stats - Role Based */}
            {(isSalesRole || isCSRole || isMentorRole) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isSalesRole && (
                        <>
                            <StatCard
                                title="Conversion Rate"
                                value={`${stats.conversion_rate || 0}%`}
                                icon={Percent}
                                description="Leads to enrollment"
                                trend={stats.conversion_rate > 5 ? 'up' : 'down'}
                                loading={loading}
                            />
                            <StatCard
                                title="Avg Deal Size"
                                value={formatCurrency(stats.avg_deal_size)}
                                icon={Target}
                                description="Per enrollment"
                                loading={loading}
                            />
                            <StatCard
                                title="Total Enrolled"
                                value={stats.enrolled_total || 0}
                                icon={GraduationCap}
                                description="All time"
                                trend="up"
                                loading={loading}
                            />
                            <StatCard
                                title="Commission (Month)"
                                value={formatCurrency(stats.commission_current_month)}
                                icon={Wallet}
                                description={`All time: ${formatCurrency(stats.commission_all_time)}`}
                                trend="up"
                                loading={loading}
                                valueColor="text-emerald-500"
                            />
                        </>
                    )}
                    
                    {isCSRole && (
                        <>
                            <StatCard
                                title="Onboarding Rate"
                                value={`${stats.onboarding_rate || 0}%`}
                                icon={Percent}
                                description="Students onboarded"
                                trend={stats.onboarding_rate > 70 ? 'up' : 'down'}
                                loading={loading}
                            />
                            <StatCard
                                title="Upgrade Pitched"
                                value={stats.upgrade_pitched || 0}
                                icon={Target}
                                description="In pipeline"
                                loading={loading}
                            />
                            <StatCard
                                title="Upgrades Closed"
                                value={stats.upgrade_closed || 0}
                                icon={CheckCircle}
                                description={formatCurrency(stats.upgrade_revenue)}
                                trend="up"
                                loading={loading}
                                valueColor="text-emerald-500"
                            />
                            <StatCard
                                title="Avg Satisfaction"
                                value={stats.avg_satisfaction_score ? `${stats.avg_satisfaction_score}/5` : '-'}
                                icon={Star}
                                description="Student rating"
                                trend={stats.avg_satisfaction_score > 4 ? 'up' : 'down'}
                                loading={loading}
                            />
                        </>
                    )}
                    
                    {isMentorRole && !isSalesRole && !isCSRole && (
                        <>
                            <StatCard
                                title="My Students"
                                value={stats.mentor_students || 0}
                                icon={Users}
                                description="Assigned to me"
                                loading={loading}
                            />
                            <StatCard
                                title="Discussion Started"
                                value={stats.discussion_started || 0}
                                icon={Phone}
                                description="Active engagement"
                                trend="up"
                                loading={loading}
                            />
                            <StatCard
                                title="Redeposit Pitched"
                                value={stats.redeposit_pitched || 0}
                                icon={Target}
                                description="In pipeline"
                                loading={loading}
                            />
                            <StatCard
                                title="Redeposits Closed"
                                value={stats.redeposit_closed || 0}
                                icon={CheckCircle}
                                description="Successful conversions"
                                trend="up"
                                loading={loading}
                                valueColor="text-emerald-500"
                            />
                        </>
                    )}
                </div>
            )}

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
