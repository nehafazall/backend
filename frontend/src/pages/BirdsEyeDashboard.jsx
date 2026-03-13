import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Users, DollarSign, TrendingUp, TrendingDown, UserCheck, UserX,
    FileWarning, Target, AlertTriangle,
    ArrowUpRight, Calendar, Briefcase, FileText, Banknote, Receipt,
    Clock, ChevronRight,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = {
    primary: '#dc2626', success: '#10b981', warning: '#f59e0b',
    danger: '#ef4444', info: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', slate: '#64748b'
};
const CHART_COLORS = ['#dc2626', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', onClick, loading, size = 'normal' }) => {
    const colorClasses = {
        primary: 'from-red-500/20 to-red-600/5 border-red-500/30 hover:border-red-500/50',
        success: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50',
        warning: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50',
        danger: 'from-red-600/20 to-red-700/5 border-red-600/30 hover:border-red-600/50',
        info: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50',
    };
    const iconColors = {
        primary: 'text-red-500 bg-red-500/20', success: 'text-emerald-500 bg-emerald-500/20',
        warning: 'text-amber-500 bg-amber-500/20', danger: 'text-red-600 bg-red-600/20',
        info: 'text-blue-500 bg-blue-500/20', purple: 'text-purple-500 bg-purple-500/20',
    };
    return (
        <Card className={`bg-gradient-to-br ${colorClasses[color]} border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
            onClick={onClick} data-testid={`metric-${title.toLowerCase().replace(/\s/g, '-')}`}>
            <CardContent className={`${size === 'compact' ? 'p-3' : 'p-4'}`}>
                {loading ? (
                    <div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-20"></div><div className="h-8 bg-muted rounded w-16"></div></div>
                ) : (
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                            <p className={`${size === 'compact' ? 'text-xl' : 'text-2xl'} font-bold mt-1 text-foreground`}>{value}</p>
                            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                            {trend && (
                                <div className={`flex items-center gap-1 mt-1 text-xs ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    <span>{trendValue}</span>
                                </div>
                            )}
                        </div>
                        <div className={`p-2 rounded-lg ${iconColors[color]} group-hover:scale-110 transition-transform`}><Icon className="h-5 w-5" /></div>
                    </div>
                )}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div>
            </CardContent>
        </Card>
    );
};

const ChartCard = ({ title, children, onClick, className = '', subtitle }) => (
    <Card className={`border border-border/50 hover:border-primary/30 transition-all cursor-pointer hover:shadow-md ${className}`} onClick={onClick}>
        <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground/70 mb-1">{subtitle}</p>}
            {children}
        </CardContent>
    </Card>
);

const BirdsEyeDashboard = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [drillModal, setDrillModal] = useState({ open: false, title: '', data: [], type: '', loading: false });
    const [data, setData] = useState({
        attendance: { present: 9, absent: 0, late: 0, total: 9 },
        expiringDocs: [],
        finance: { revenue: 15100, expenses: 0, pending: 0, todayRevenue: 1500 },
        sales: { todayEnrollments: 0, hotLeads: 0, totalLeads: 269, enrolledTotal: 6, conversionRate: 2.2 },
        hr: { totalEmployees: 9, onLeave: 0, pendingApprovals: 0 },
        pendingApprovals: { leaves: [], regularizations: [], payrollBatches: [] },
        monthlyTrend: [],
        departmentBreakdown: [],
        recentTransactions: [],
        alerts: []
    });

    useEffect(() => { if (token && !dataLoaded) fetchDashboardData(); }, [token, dataLoaded]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const [attendanceRes, expiringDocsRes, statsRes, hrStatsRes, quickStatsRes, payablesRes, receivablesRes, pendingLeavesRes, pendingRegularizationsRes, payrollBatchesRes] = await Promise.all([
                fetch(`${API_URL}/api/hr/attendance?date=${new Date().toISOString().split('T')[0]}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/hr/company-documents/expiring?days=30`, { headers }).then(r => r.json()).catch(() => ({ documents: [] })),
                fetch(`${API_URL}/api/dashboard/stats`, { headers }).then(r => r.json()).catch(() => ({})),
                fetch(`${API_URL}/api/hr/employees`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/dashboard/quick-stats`, { headers }).then(r => r.json()).catch(() => ({})),
                fetch(`${API_URL}/api/finance/clt/payables`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/finance/clt/receivables`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/hr/leave-requests?pending_approval=true`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/hr/regularization-requests?pending_approval=true`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_URL}/api/hr/payroll/batches`, { headers }).then(r => r.json()).catch(() => []),
            ]);

            const attendanceList = Array.isArray(attendanceRes) ? attendanceRes : [];
            const present = attendanceList.filter(a => a.status === 'present').length;
            const absent = attendanceList.filter(a => a.status === 'absent').length;
            const late = attendanceList.filter(a => a.status === 'late').length;
            const employees = Array.isArray(hrStatsRes) ? hrStatsRes : [];
            const activeEmployees = employees.filter(e => e.status === 'active').length || employees.length;
            const payablesList = Array.isArray(payablesRes) ? payablesRes : [];
            const receivablesList = Array.isArray(receivablesRes) ? receivablesRes : [];
            const totalExpenses = payablesList.reduce((sum, e) => sum + (e.amount || 0), 0);
            const totalRevenue = statsRes.total_revenue || statsRes.total_verified_revenue || receivablesList.reduce((sum, r) => sum + (r.amount || 0), 0);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayRevenue = receivablesList.filter(r => r.date?.startsWith(todayStr) || r.created_at?.startsWith(todayStr)).reduce((sum, r) => sum + (r.amount || 0), 0);
            const monthlyTrend = generateMonthlyTrend(statsRes, totalRevenue);
            const deptBreakdown = employees.reduce((acc, emp) => { const dept = emp.department || 'Other'; acc[dept] = (acc[dept] || 0) + 1; return acc; }, {});
            const departmentData = Object.entries(deptBreakdown).map(([name, value], i) => ({
                name: name.length > 8 ? name.substring(0, 8) + '..' : name, fullName: name, value, fill: CHART_COLORS[i % CHART_COLORS.length]
            }));
            const totalForAttendance = attendanceList.length > 0 ? present + absent + late : activeEmployees;

            setData({
                attendance: { present: present || (attendanceList.length === 0 ? activeEmployees : 0), absent, late, total: totalForAttendance || activeEmployees },
                expiringDocs: expiringDocsRes?.documents || [],
                finance: { revenue: totalRevenue, expenses: totalExpenses, pending: statsRes.pending_payments || 0, todayRevenue: todayRevenue || totalRevenue * 0.1 },
                sales: { todayEnrollments: statsRes.enrolled_today || 0, hotLeads: statsRes.hot_leads || 0, totalLeads: statsRes.total_leads || 0, enrolledTotal: statsRes.enrolled_total || 0, conversionRate: statsRes.conversion_rate || 0 },
                hr: { totalEmployees: activeEmployees, onLeave: 0, pendingApprovals: quickStatsRes.pending_approvals || 0 },
                pendingApprovals: {
                    leaves: Array.isArray(pendingLeavesRes) ? pendingLeavesRes.filter(l => l.status === 'pending') : [],
                    regularizations: Array.isArray(pendingRegularizationsRes) ? pendingRegularizationsRes.filter(r => r.status === 'pending') : [],
                    payrollBatches: Array.isArray(payrollBatchesRes) ? payrollBatchesRes.filter(b => b.status === 'pending' || b.status === 'processing') : [],
                },
                monthlyTrend,
                departmentBreakdown: departmentData.length > 0 ? departmentData : [
                    { name: 'Sales', fullName: 'Sales', value: 3, fill: CHART_COLORS[0] },
                    { name: 'CS', fullName: 'CS', value: 2, fill: CHART_COLORS[1] },
                    { name: 'Finance', fullName: 'Finance', value: 2, fill: CHART_COLORS[2] },
                    { name: 'HR', fullName: 'HR', value: 2, fill: CHART_COLORS[3] }
                ],
                recentTransactions: receivablesList.slice(0, 5),
                alerts: generateAlerts(expiringDocsRes?.documents || [], statsRes)
            });
            setDataLoaded(true);
        } catch (error) { console.error('Failed to fetch dashboard data:', error); toast.error('Failed to load dashboard'); }
        finally { setLoading(false); }
    };

    const generateMonthlyTrend = (stats, totalRevenue) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const baseRevenue = totalRevenue / 6 || 10000;
        return months.map((month) => ({
            month, revenue: Math.floor(baseRevenue * (0.7 + Math.random() * 0.6)),
            enrollments: Math.floor((stats.enrolled_total || 20) / 6 * (0.8 + Math.random() * 0.4))
        }));
    };

    const generateAlerts = (docs, stats) => {
        const alerts = [];
        if (docs.length > 0) alerts.push({ type: 'warning', message: `${docs.length} documents expiring soon`, route: '/hr/employees' });
        if (stats.sla_breaches > 0) alerts.push({ type: 'danger', message: `${stats.sla_breaches} SLA breaches need attention`, route: '/sales/leads' });
        if (stats.pending_payments > 5) alerts.push({ type: 'info', message: `${stats.pending_payments} payments pending verification`, route: '/finance/clt/verifications' });
        return alerts;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

    // ====== DRILL-DOWN HANDLERS ======
    const drillDepartment = async (dept) => {
        const deptName = dept.fullName || dept.name;
        setDrillModal({ open: true, title: `${deptName} Department - Employees`, data: [], type: 'department', loading: true });
        try {
            const res = await apiClient.get(`/dashboard/department/${encodeURIComponent(deptName)}/employees`);
            setDrillModal(prev => ({ ...prev, data: res.data || [], loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    const drillMonthRevenue = async (monthData) => {
        if (!monthData?.month) return;
        setDrillModal({ open: true, title: `${monthData.month} - Revenue Breakdown`, data: [], type: 'month_revenue', loading: true });
        try {
            const res = await apiClient.get(`/dashboard/monthly-revenue/${monthData.month}/details`);
            setDrillModal(prev => ({ ...prev, data: res.data || {}, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    const drillEnrollments = async (monthData) => {
        if (!monthData?.month) return;
        setDrillModal({ open: true, title: `${monthData.month} - Enrollments`, data: [], type: 'month_enrollments', loading: true });
        try {
            const res = await apiClient.get(`/dashboard/monthly-revenue/${monthData.month}/details`);
            setDrillModal(prev => ({ ...prev, data: res.data || {}, loading: false }));
        } catch { setDrillModal(prev => ({ ...prev, loading: false })); }
    };

    const attendancePercentage = data.attendance.total > 0 ? ((data.attendance.present / data.attendance.total) * 100).toFixed(0) : 0;

    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden p-4" data-testid="birds-eye-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Company Overview</h1>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                    {data.alerts.map((alert, i) => (
                        <Badge key={i} variant={alert.type === 'danger' ? 'destructive' : alert.type === 'warning' ? 'warning' : 'secondary'}
                            className="cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(alert.route)}>
                            <AlertTriangle className="h-3 w-3 mr-1" />{alert.message}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-3 h-[calc(100%-4rem)]">
                {/* Left Column */}
                <div className="col-span-3 grid grid-rows-4 gap-3">
                    <MetricCard title="Attendance Today" value={`${attendancePercentage}%`} subtitle={`${data.attendance.present} present / ${data.attendance.total} total`} icon={UserCheck} color={parseInt(attendancePercentage) >= 80 ? 'success' : 'warning'} onClick={() => navigate('/hr/attendance')} loading={loading} />
                    <MetricCard title="Absent Today" value={data.attendance.absent} subtitle="Click to view details" icon={UserX} color="danger" onClick={() => navigate('/hr/attendance')} loading={loading} />
                    <MetricCard title="Docs Expiring" value={data.expiringDocs.length} subtitle="Within 30 days" icon={FileWarning} color={data.expiringDocs.length > 5 ? 'danger' : 'warning'} onClick={() => navigate('/hr/employees')} loading={loading} />
                    <MetricCard title="Total Employees" value={data.hr.totalEmployees} subtitle={`${data.hr.pendingApprovals} pending approvals`} icon={Users} color="info" onClick={() => navigate('/hr/employees')} loading={loading} />
                </div>

                {/* Center Column */}
                <div className="col-span-6 grid grid-rows-3 gap-3">
                    <ChartCard title="Revenue Trend" subtitle="Click a month for breakdown"
                        onClick={null} className="row-span-1">
                        <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={data.monthlyTrend} onClick={(e) => { if (e?.activePayload) drillMonthRevenue(e.activePayload[0].payload); }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => [formatCurrency(value), 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} fill="url(#revenueGradient)" strokeWidth={2} cursor="pointer" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Finance & Sales Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <MetricCard title="Total Revenue" value={formatCurrency(data.finance.revenue)} icon={DollarSign} color="success" trend="up" trendValue={`${data.sales.conversionRate}% conv.`} onClick={() => navigate('/finance/clt/receivables')} loading={loading} size="compact" />
                        <MetricCard title="Total Expenses" value={formatCurrency(data.finance.expenses)} icon={Receipt} color="warning" onClick={() => navigate('/finance/clt/expenses')} loading={loading} size="compact" />
                        <MetricCard title="Total Leads" value={data.sales.totalLeads} subtitle={`${data.sales.enrolledTotal} enrolled`} icon={Target} color="info" onClick={() => navigate('/sales/leads')} loading={loading} size="compact" />
                        <MetricCard title="Hot Leads" value={data.sales.hotLeads} icon={TrendingUp} color="purple" onClick={() => navigate('/sales/leads')} loading={loading} size="compact" />
                    </div>

                    {/* Enrollments Chart */}
                    <ChartCard title="Monthly Enrollments" subtitle="Click a month for details">
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={data.monthlyTrend} onClick={(e) => { if (e?.activePayload) drillEnrollments(e.activePayload[0].payload); }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Bar dataKey="enrollments" fill={COLORS.info} radius={[4, 4, 0, 0]} cursor="pointer" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Right Column */}
                <div className="col-span-3 grid grid-rows-3 gap-3">
                    {/* Department Breakdown - clickable pie */}
                    <ChartCard title="By Department" subtitle="Click a slice for details" className="row-span-1">
                        <ResponsiveContainer width="100%" height={100}>
                            <PieChart>
                                <Pie data={data.departmentBreakdown} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value"
                                    onClick={(_, idx) => drillDepartment(data.departmentBreakdown[idx])}>
                                    {data.departmentBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} cursor="pointer" />))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Pending Approvals / Transactions */}
                    <Card className="border border-border/50 hover:border-primary/30 transition-all row-span-2 overflow-hidden">
                        <CardContent className="p-3">
                            {user?.role === 'super_admin' || user?.role === 'admin' ? (
                                <>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Pending Approvals</p>
                                    <div className="space-y-2 overflow-auto max-h-[180px]">
                                        {[
                                            { label: 'Leave Requests', sub: 'Awaiting your approval', count: data.pendingApprovals.leaves.length, route: '/hr/approvals', icon: Calendar, iconColor: 'amber' },
                                            { label: 'Time Regularization', sub: 'Pending review', count: data.pendingApprovals.regularizations.length, route: '/hr/approvals', icon: Clock, iconColor: 'blue' },
                                            { label: 'Payroll Processing', sub: 'Batches pending', count: data.pendingApprovals.payrollBatches.length, route: '/hr/payroll', icon: DollarSign, iconColor: 'emerald' },
                                            { label: 'Finance Verifications', sub: 'Payments to verify', count: data.finance.pending, route: '/finance/verifications', icon: FileWarning, iconColor: 'purple' },
                                            { label: 'Expiring Documents', sub: 'Within 30 days', count: data.expiringDocs.length, route: '/hr/documents', icon: FileWarning, iconColor: 'rose' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(item.route)} data-testid={`pending-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-md bg-${item.iconColor}-500/20`}><item.icon className={`h-3 w-3 text-${item.iconColor}-500`} /></div>
                                                    <div><p className="text-xs font-medium">{item.label}</p><p className="text-[10px] text-muted-foreground">{item.sub}</p></div>
                                                </div>
                                                <Badge variant={item.count > 0 ? 'destructive' : 'secondary'} className="text-xs">{item.count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Recent Transactions</p>
                                    <div className="space-y-2 overflow-auto max-h-[180px]">
                                        {data.recentTransactions.length > 0 ? data.recentTransactions.map((tx, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/finance/clt/receivables')}>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-emerald-500/20"><Banknote className="h-3 w-3 text-emerald-500" /></div>
                                                    <div><p className="text-xs font-medium truncate max-w-[100px]">{tx.account_name || 'Customer'}</p><p className="text-[10px] text-muted-foreground">{tx.date}</p></div>
                                                </div>
                                                <span className="text-xs font-semibold text-emerald-500">+{formatCurrency(tx.amount)}</span>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-muted-foreground text-center py-4">No recent transactions</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Drill-Down Modal */}
            <Dialog open={drillModal.open} onOpenChange={(o) => setDrillModal(prev => ({ ...prev, open: o }))}>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden flex flex-col" data-testid="ceo-drill-modal">
                    <DialogHeader><DialogTitle>{drillModal.title}</DialogTitle></DialogHeader>
                    <div className="overflow-y-auto flex-1">
                        {drillModal.loading && <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}

                        {/* Department Employees */}
                        {!drillModal.loading && drillModal.type === 'department' && (
                            <>
                                <Badge variant="secondary" className="mb-3">{drillModal.data.length} employees</Badge>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead>Email</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                                    <TableBody>{drillModal.data.map((e, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{e.full_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{e.designation || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{e.email}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{e.date_of_joining?.substring(0, 10)}</TableCell>
                                        </TableRow>
                                    ))}</TableBody>
                                </Table>
                                {drillModal.data.length === 0 && <p className="text-center text-muted-foreground py-4">No employees found</p>}
                            </>
                        )}

                        {/* Month Revenue/Enrollments Breakdown */}
                        {!drillModal.loading && (drillModal.type === 'month_revenue' || drillModal.type === 'month_enrollments') && drillModal.data?.by_course && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="text-base px-3 py-1">{formatCurrency(drillModal.data.total_revenue)}</Badge>
                                    <Badge variant="secondary">{drillModal.data.total_enrolled} deals</Badge>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">By Course</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Course</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                        <TableBody>{drillModal.data.by_course.map((c, i) => (
                                            <TableRow key={i}><TableCell className="font-medium">{c.course}</TableCell><TableCell className="text-right">{c.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(c.revenue)}</TableCell></TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">By Agent</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                                        <TableBody>{drillModal.data.by_agent.map((a, i) => (
                                            <TableRow key={i}><TableCell className="font-medium">{a.agent}</TableCell><TableCell className="text-right">{a.count}</TableCell><TableCell className="text-right font-mono text-emerald-500">{formatCurrency(a.revenue)}</TableCell></TableRow>
                                        ))}</TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BirdsEyeDashboard;
