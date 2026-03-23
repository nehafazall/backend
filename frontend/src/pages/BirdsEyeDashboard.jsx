import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, Users, UserCheck, UserX,
    FileWarning, AlertTriangle, Banknote, Receipt, Clock, Shield,
    ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Wallet, CreditCard,
    Trophy, Medal, Award, Star, Activity, Building2, CircleDollarSign,
    Calendar as CalendarIcon, ChevronDown, Target, UserPlus, GraduationCap, Zap,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const DEPT_COLORS = { sales: '#dc2626', cs: '#3b82f6', mentors: '#10b981' };
const PIE_COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6', unknown: '#94a3b8' };

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'overall', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
];

const formatAED = (v) => `AED ${(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const BirdsEyeDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [d, setD] = useState(null);
    const [period, setPeriod] = useState('this_month');
    const [customRange, setCustomRange] = useState({ from: undefined, to: undefined });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [drillLevel, setDrillLevel] = useState('departments'); // departments > teams > agents
    const [drillData, setDrillData] = useState(null);
    const [drillLabel, setDrillLabel] = useState('');
    const [showNewLeadsDialog, setShowNewLeadsDialog] = useState(false);

    useEffect(() => {
        if (user) {
            if (period === 'custom') {
                if (customRange.from && customRange.to) fetchData();
            } else {
                fetchData();
            }
        }
    }, [user, period, customRange]);

    const fetchData = async () => {
        setLoading(true);
        setDrillLevel('departments');
        setDrillData(null);
        try {
            let url = `/dashboard/overall?period=${period}`;
            if (period === 'custom' && customRange.from && customRange.to) {
                const startStr = format(customRange.from, 'yyyy-MM-dd');
                const endStr = format(customRange.to, 'yyyy-MM-dd');
                url += `&custom_start=${startStr}&custom_end=${endStr}`;
            }
            const res = await apiClient.get(url);
            setD(res.data);
        } catch (e) { console.error(e); toast.error('Failed to load dashboard'); }
        setLoading(false);
    };

    const handlePeriodChange = (value) => {
        if (value === 'custom') {
            setPeriod('custom');
            setShowDatePicker(true);
        } else {
            setPeriod(value);
            setShowDatePicker(false);
            setCustomRange({ from: undefined, to: undefined });
        }
    };

    const handlePieClick = async (entry) => {
        if (drillLevel === 'departments' && entry.name === 'Sales') {
            // Drill into Sales → show Teams
            try {
                const res = await apiClient.get(`/dashboard/team-revenue?period=${period}`);
                const teamData = (res.data || []).map(t => ({ name: t.team_name, value: t.revenue, deals: t.deals, team_id: t.team_id }));
                setDrillData(teamData);
                setDrillLevel('teams');
                setDrillLabel('Sales → Teams');
            } catch (e) { toast.error('Failed to load team data'); }
        } else if (drillLevel === 'teams') {
            // Drill into a Team → show Agents
            try {
                const teamName = encodeURIComponent(entry.name);
                const res = await apiClient.get(`/dashboard/team-revenue/${teamName}/agents?period=${period}`);
                const agentData = (res.data || []).map(a => ({ name: a.agent_name, value: a.revenue, deals: a.deals }));
                setDrillData(agentData);
                setDrillLevel('agents');
                setDrillLabel(`${entry.name} → Agents`);
            } catch (e) { toast.error('Failed to load agent data'); }
        }
    };

    const handleDrillBack = () => {
        if (drillLevel === 'agents') {
            setDrillLevel('teams');
            // Re-fetch teams
            handlePieClick({ name: 'Sales' });
        } else if (drillLevel === 'teams') {
            setDrillLevel('departments');
            setDrillData(null);
            setDrillLabel('');
        }
    };

    if (loading || !d) return (
        <div className="p-6 space-y-4" data-testid="overall-dashboard-loading">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        </div>
    );

    const rev = d.revenue;
    const sp = rev.selected_period;
    const periodLabel = period === 'custom' && customRange.from && customRange.to
        ? `${format(customRange.from, 'MMM d')} – ${format(customRange.to, 'MMM d, yyyy')}`
        : (PERIOD_OPTIONS.find(p => p.value === period)?.label || 'This Month');

    const genderData = Object.entries(d.hr.gender || {}).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1), value: v, fill: GENDER_COLORS[k] || '#94a3b8'
    }));

    const attendancePct = d.hr.attendance_total > 0 ? Math.round((d.hr.present_today / d.hr.attendance_total) * 100) : 0;

    return (
        <div className="p-4 space-y-4 overflow-auto h-[calc(100vh-4rem)]" data-testid="overall-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Overall Dashboard</h1>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={period} onValueChange={handlePeriodChange} data-testid="period-filter">
                        <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="period-filter-trigger">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} data-testid={`period-${opt.value}`}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {period === 'custom' && (
                        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" data-testid="custom-date-trigger">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    {customRange.from && customRange.to
                                        ? `${format(customRange.from, 'MMM d')} – ${format(customRange.to, 'MMM d')}`
                                        : 'Pick dates'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="range"
                                    selected={customRange}
                                    onSelect={(range) => {
                                        setCustomRange(range || { from: undefined, to: undefined });
                                        if (range?.from && range?.to) {
                                            setShowDatePicker(false);
                                        }
                                    }}
                                    numberOfMonths={2}
                                    disabled={{ after: new Date() }}
                                    data-testid="custom-date-calendar"
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                    {d.sla_breaches > 0 && (
                        <Badge variant="destructive" className="cursor-pointer" onClick={() => navigate('/sales')} data-testid="sla-alert">
                            <AlertTriangle className="h-3 w-3 mr-1" />{d.sla_breaches} SLA Breaches
                        </Badge>
                    )}
                    {d.pending_verifications > 0 && (
                        <Badge variant="secondary" className="cursor-pointer" onClick={() => navigate('/finance/clt/verifications')} data-testid="pending-verification-alert">
                            <Clock className="h-3 w-3 mr-1" />{d.pending_verifications} Pending Verifications
                        </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={fetchData} data-testid="refresh-dashboard"><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Row 1: Revenue KPI Cards - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="revenue-cards">
                <KPICard title="Overall Revenue" value={formatAED(sp.total)} subtitle={`${periodLabel}`} icon={DollarSign} color="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/30" iconBg="bg-amber-500/20 text-amber-500" testId="overall-revenue" />
                <KPICard title="Sales Revenue" value={formatAED(sp.sales)} subtitle={`${sp.sales_count} enrollments`} icon={TrendingUp} color="bg-gradient-to-br from-red-500/15 to-red-600/5 border-red-500/30" iconBg="bg-red-500/20 text-red-500" testId="sales-revenue" onClick={() => navigate('/sales/dashboard')} />
                <KPICard title="CS Revenue" value={formatAED(sp.cs)} subtitle={`${sp.cs_count} upgrades`} icon={Activity} color="bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-blue-500/30" iconBg="bg-blue-500/20 text-blue-500" testId="cs-revenue" onClick={() => navigate('/cs/dashboard')} />
                <KPICard title="Academics Revenue" value={formatAED(sp.mentors)} subtitle={`${sp.mentor_count} deposits`} icon={Award} color="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-emerald-500/30" iconBg="bg-emerald-500/20 text-emerald-500" testId="mentor-revenue" onClick={() => navigate('/academics')} />
            </div>

            {/* Row 2: Operational KPIs - Clickable Navigation */}
            {d.operational && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3" data-testid="operational-kpi-row">
                    <MiniCard title="Active Pipeline" value={d.operational.active_pipeline} icon={Target} color="text-orange-500" testId="active-pipeline" onClick={() => navigate('/sales')} />
                    <MiniCard title="New Leads Today" value={d.operational.new_leads_today} icon={UserPlus} color="text-violet-500" testId="new-leads-today" onClick={() => setShowNewLeadsDialog(true)} />
                    <MiniCard title="Pending Activations" value={d.operational.pending_activations} icon={Zap} color="text-cyan-500" testId="pending-activations" onClick={() => navigate('/cs')} />
                    <MiniCard title="Mentor Students" value={d.operational.mentor_students} icon={GraduationCap} color="text-emerald-500" testId="mentor-students" onClick={() => navigate('/mentor')} />
                    <MiniCard title="Enrolled YTD" value={d.operational.enrolled_ytd} icon={Trophy} color="text-amber-600" testId="enrolled-ytd" />
                    <MiniCard title="Enrolled MTD" value={d.operational.enrolled_mtd} icon={TrendingUp} color="text-teal-500" testId="enrolled-mtd" />
                </div>
            )}

            {/* Row 3: Treasury + Expenses + HR Summary - Clickable */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="treasury-hr-row">
                <MiniCard title="In Bank" value={formatAED(d.treasury.in_bank)} icon={Landmark} color="text-emerald-500" testId="in-bank" onClick={() => navigate('/finance/clt/receivables')} />
                <MiniCard title="Pending Settlement" value={formatAED(d.treasury.pending_settlement)} icon={Clock} color="text-amber-500" testId="pending-settlement" onClick={() => navigate('/finance/clt/verifications')} />
                <MiniCard title="Expenses" value={formatAED(d.expenses.this_month)} icon={CreditCard} color="text-red-500" subtitle={`${d.expenses.count} entries`} testId="monthly-expenses" onClick={() => navigate('/finance/expenses')} />
                <MiniCard title="Active Employees" value={d.hr.total_active} icon={Users} color="text-blue-500" testId="active-employees" onClick={() => navigate('/hr/employees')} />
                <MiniCard title="Present Today" value={`${d.hr.present_today}/${d.hr.attendance_total}`} icon={UserCheck} color="text-emerald-500" subtitle={`${attendancePct}%`} testId="present-today" onClick={() => navigate('/hr/attendance')} />
            </div>

            {/* Row 3: Monthly Revenue Trend + Revenue Split Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border border-border/50" data-testid="monthly-trend-chart">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Monthly Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={d.monthly_trend}>
                                <defs>
                                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.sales} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.sales} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="gCS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.cs} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.cs} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="gMentors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.mentors} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.mentors} stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="sales" name="Sales" stroke={DEPT_COLORS.sales} fill="url(#gSales)" strokeWidth={2} />
                                <Area type="monotone" dataKey="cs" name="CS" stroke={DEPT_COLORS.cs} fill="url(#gCS)" strokeWidth={2} />
                                <Area type="monotone" dataKey="mentors" name="Academics" stroke={DEPT_COLORS.mentors} fill="url(#gMentors)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border border-border/50" data-testid="revenue-split-chart">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                                {drillLevel === 'departments' ? `Revenue Bifurcation (${periodLabel})` : drillLabel}
                            </CardTitle>
                            {drillLevel !== 'departments' && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleDrillBack} data-testid="drill-back-btn">
                                    <ChevronDown className="h-3 w-3 mr-1 rotate-90" /> Back
                                </Button>
                            )}
                        </div>
                        {drillLevel === 'departments' && <p className="text-[10px] text-muted-foreground mt-0.5">Click "Sales" to drill into teams</p>}
                        {drillLevel === 'teams' && <p className="text-[10px] text-muted-foreground mt-0.5">Click a team to see agents</p>}
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={drillData || d.revenue_split} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
                                <Tooltip formatter={(v) => formatAED(v)} />
                                <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]} cursor={drillLevel !== 'agents' ? 'pointer' : 'default'} onClick={(data) => drillLevel !== 'agents' && handlePieClick(data)}>
                                    {(drillData || d.revenue_split).map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: Department Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="dept-revenue">
                <ComparisonCard dept="Sales" current={sp.sales} allTime={rev.all_time.sales} color={DEPT_COLORS.sales} icon={TrendingUp} periodLabel={periodLabel} onClick={() => navigate('/sales/dashboard')} />
                <ComparisonCard dept="Customer Service" current={sp.cs} allTime={rev.all_time.cs} color={DEPT_COLORS.cs} icon={Activity} periodLabel={periodLabel} onClick={() => navigate('/cs/dashboard')} />
                <ComparisonCard dept="Academics" current={sp.mentors} allTime={rev.all_time.mentors} color={DEPT_COLORS.mentors} icon={Award} periodLabel={periodLabel} onClick={() => navigate('/academics')} />
            </div>

            {/* Row 5: Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="top-performers">
                <TopPerformersCard title="Top 5 Sales Agents" data={d.top_performers.sales} metricKey="deals" metricLabel="deals" icon={Trophy} color="text-red-500" bgColor="bg-red-500/10" />
                <TopPerformersCard title="Top 3 CS Agents" data={d.top_performers.cs} metricKey="upgrades" metricLabel="upgrades" icon={Medal} color="text-blue-500" bgColor="bg-blue-500/10" />
                <TopPerformersCard title="Top 3 Academics" data={d.top_performers.mentors} metricKey="deposits" metricLabel="deposits" icon={Star} color="text-emerald-500" bgColor="bg-emerald-500/10" />
            </div>

            {/* Row 6: Gender + Docs Expiry + Recent Enrollments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gender Bifurcation */}
                <Card className="border border-border/50" data-testid="gender-chart">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Gender Bifurcation</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        {genderData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = outerRadius + 20;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                        return <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>{`${name}: ${value}`}</text>;
                                    }} labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}>
                                        {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: 'hsl(var(--foreground))' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">No employee data</div>
                        )}
                    </CardContent>
                </Card>

                {/* Documents Expiring */}
                <Card className="border border-border/50" data-testid="expiring-docs">
                    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Documents Expiring Soon</CardTitle>
                        {d.expiring_documents_total > 0 && (
                            <Badge variant="destructive" className="text-xs">{d.expiring_documents_total}</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        {d.expiring_documents.length > 0 ? (
                            <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                {d.expiring_documents.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{doc.employee_name}</p>
                                            <p className="text-[10px] text-muted-foreground">{doc.document}</p>
                                        </div>
                                        <Badge variant={doc.urgency === 'critical' ? 'destructive' : doc.urgency === 'high' ? 'warning' : 'secondary'} className="text-[10px] ml-2 shrink-0">
                                            {doc.days_left}d
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">No documents expiring soon</div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Enrollments */}
                <Card className="border border-border/50" data-testid="recent-enrollments">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Recent Enrollments</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        {d.recent_enrollments.length > 0 ? (
                            <div className="space-y-2 max-h-[180px] overflow-y-auto">
                                {d.recent_enrollments.map((e, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{e.name}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{e.course || 'N/A'} &middot; {e.agent || 'N/A'}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-emerald-600 ml-2 shrink-0">{formatAED(e.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">No recent enrollments</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* New Leads Today Dialog */}
            <Dialog open={showNewLeadsDialog} onOpenChange={setShowNewLeadsDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="new-leads-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-violet-500" />
                            New Leads Today ({d.operational?.new_leads_today || 0})
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        {(d.operational?.new_leads_today_list || []).length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Name</TableHead>
                                        <TableHead className="text-xs">Phone</TableHead>
                                        <TableHead className="text-xs">Source</TableHead>
                                        <TableHead className="text-xs">Assigned To</TableHead>
                                        <TableHead className="text-xs">Stage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {d.operational.new_leads_today_list.map((lead, i) => (
                                        <TableRow key={lead.id || i}>
                                            <TableCell className="text-xs font-medium">{lead.full_name}</TableCell>
                                            <TableCell className="text-xs font-mono">{lead.phone}</TableCell>
                                            <TableCell className="text-xs">{lead.lead_source || '-'}</TableCell>
                                            <TableCell className="text-xs">{lead.assigned_to_name || 'Unassigned'}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {lead.stage?.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No new leads today</div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};

/* =========== SUB-COMPONENTS =========== */

const KPICard = ({ title, value, subtitle, icon: Icon, color, iconBg, testId, onClick }) => {
    return (
        <Card className={`${color} border transition-all hover:scale-[1.02] hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`} data-testid={testId} onClick={onClick}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                        <p className="text-xl font-bold mt-1">{value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${iconBg}`}><Icon className="h-5 w-5" /></div>
                </div>
            </CardContent>
        </Card>
    );
};

const MiniCard = ({ title, value, icon: Icon, color, subtitle, testId, onClick }) => (
    <Card className={`border border-border/50 hover:border-primary/20 transition-all ${onClick ? 'cursor-pointer' : ''}`} data-testid={testId} onClick={onClick}>
        <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted/50 ${color}`}><Icon className="h-4 w-4" /></div>
            <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
                <p className="text-base font-bold">{value}</p>
                {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
        </CardContent>
    </Card>
);

const ComparisonCard = ({ dept, current, allTime, color, icon: Icon, periodLabel, onClick }) => {
    return (
        <Card className={`border border-border/50 ${onClick ? 'cursor-pointer hover:border-primary/30' : ''}`} data-testid={`comparison-${dept.toLowerCase().replace(/\s/g, '-')}`} onClick={onClick}>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <p className="text-sm font-medium">{dept}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{periodLabel}</p>
                        <p className="text-lg font-bold" style={{ color }}>{formatAED(current)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">All Time</p>
                        <p className="text-lg font-bold text-muted-foreground">{formatAED(allTime)}</p>
                    </div>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${allTime > 0 ? Math.min((current / allTime) * 100, 100) : 0}%`, backgroundColor: color }} />
                </div>
            </CardContent>
        </Card>
    );
};

const TopPerformersCard = ({ title, data, metricKey, metricLabel, icon: Icon, color, bgColor }) => (
    <Card className="border border-border/50" data-testid={`top-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} /> {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
            {data.length > 0 ? (
                <div className="space-y-2">
                    {data.map((p, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? `${bgColor} ${color}` : 'bg-muted text-muted-foreground'}`}>
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground">{p[metricKey]} {metricLabel}</p>
                            </div>
                            <span className="text-xs font-semibold">{formatAED(p.revenue)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">No data this month</div>
            )}
        </CardContent>
    </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
            <p className="font-medium mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-6 py-0.5">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span>
                    <span className="font-medium">{formatAED(p.value)}</span>
                </div>
            ))}
            {payload.length > 1 && (
                <div className="flex items-center justify-between gap-6 pt-1 mt-1 border-t border-border/50 font-semibold">
                    <span>Total</span>
                    <span>{formatAED(payload.reduce((s, p) => s + (p.value || 0), 0))}</span>
                </div>
            )}
        </div>
    );
};

export default BirdsEyeDashboard;
