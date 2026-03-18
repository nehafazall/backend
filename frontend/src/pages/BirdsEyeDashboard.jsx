import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, Users, UserCheck, UserX,
    FileWarning, AlertTriangle, Banknote, Receipt, Clock, Shield,
    ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Wallet, CreditCard,
    Trophy, Medal, Award, Star, Activity, Building2, CircleDollarSign,
} from 'lucide-react';

const DEPT_COLORS = { sales: '#dc2626', cs: '#3b82f6', mentors: '#10b981' };
const PIE_COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6', unknown: '#94a3b8' };

const formatAED = (v) => `AED ${(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const pctChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : curr > 0 ? '+100' : '0';

const BirdsEyeDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [d, setD] = useState(null);

    useEffect(() => { if (user) fetchData(); }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/dashboard/overall');
            setD(res.data);
        } catch (e) { console.error(e); toast.error('Failed to load dashboard'); }
        setLoading(false);
    };

    if (loading || !d) return (
        <div className="p-6 space-y-4" data-testid="overall-dashboard-loading">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        </div>
    );

    const rev = d.revenue;
    const salesPct = pctChange(rev.this_month.sales, rev.last_month.sales);
    const csPct = pctChange(rev.this_month.cs, rev.last_month.cs);
    const mentorPct = pctChange(rev.this_month.mentors, rev.last_month.mentors);
    const overallPct = pctChange(rev.this_month.total, rev.last_month.total);

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

            {/* Row 1: Revenue KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="revenue-cards">
                <KPICard title="Overall Revenue" value={formatAED(rev.this_month.total)} subtitle={`Last Month: ${formatAED(rev.last_month.total)}`} pct={overallPct} icon={DollarSign} color="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/30" iconBg="bg-amber-500/20 text-amber-500" testId="overall-revenue" />
                <KPICard title="Sales Revenue" value={formatAED(rev.this_month.sales)} subtitle={`${rev.this_month.sales_count} enrollments`} pct={salesPct} icon={TrendingUp} color="bg-gradient-to-br from-red-500/15 to-red-600/5 border-red-500/30" iconBg="bg-red-500/20 text-red-500" testId="sales-revenue" />
                <KPICard title="CS Revenue" value={formatAED(rev.this_month.cs)} subtitle={`${rev.this_month.cs_count} upgrades`} pct={csPct} icon={Activity} color="bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-blue-500/30" iconBg="bg-blue-500/20 text-blue-500" testId="cs-revenue" />
                <KPICard title="Mentor Revenue" value={formatAED(rev.this_month.mentors)} subtitle={`${rev.this_month.mentor_count} deposits`} pct={mentorPct} icon={Award} color="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-emerald-500/30" iconBg="bg-emerald-500/20 text-emerald-500" testId="mentor-revenue" />
            </div>

            {/* Row 2: Treasury + Expenses + HR Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="treasury-hr-row">
                <MiniCard title="In Bank" value={formatAED(d.treasury.in_bank)} icon={Landmark} color="text-emerald-500" testId="in-bank" />
                <MiniCard title="Pending Settlement" value={formatAED(d.treasury.pending_settlement)} icon={Clock} color="text-amber-500" testId="pending-settlement" />
                <MiniCard title="Monthly Expenses" value={formatAED(d.expenses.this_month)} icon={CreditCard} color="text-red-500" subtitle={`${d.expenses.count} entries`} testId="monthly-expenses" />
                <MiniCard title="Active Employees" value={d.hr.total_active} icon={Users} color="text-blue-500" testId="active-employees" />
                <MiniCard title="Present Today" value={`${d.hr.present_today}/${d.hr.attendance_total}`} icon={UserCheck} color="text-emerald-500" subtitle={`${attendancePct}%`} testId="present-today" />
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
                                <Area type="monotone" dataKey="mentors" name="Mentors" stroke={DEPT_COLORS.mentors} fill="url(#gMentors)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border border-border/50" data-testid="revenue-split-chart">
                    <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm font-medium">Revenue Bifurcation (This Month)</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={d.revenue_split} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                                <Tooltip formatter={(v) => formatAED(v)} />
                                <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]}>
                                    {d.revenue_split.map((entry, i) => <Cell key={i} fill={Object.values(DEPT_COLORS)[i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Row 4: This Month vs Last Month Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="month-comparison">
                <ComparisonCard dept="Sales" current={rev.this_month.sales} previous={rev.last_month.sales} color={DEPT_COLORS.sales} icon={TrendingUp} />
                <ComparisonCard dept="Customer Service" current={rev.this_month.cs} previous={rev.last_month.cs} color={DEPT_COLORS.cs} icon={Activity} />
                <ComparisonCard dept="Mentors" current={rev.this_month.mentors} previous={rev.last_month.mentors} color={DEPT_COLORS.mentors} icon={Award} />
            </div>

            {/* Row 5: Top Performers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="top-performers">
                <TopPerformersCard title="Top 5 Sales Agents" data={d.top_performers.sales} metricKey="deals" metricLabel="deals" icon={Trophy} color="text-red-500" bgColor="bg-red-500/10" />
                <TopPerformersCard title="Top 3 CS Agents" data={d.top_performers.cs} metricKey="upgrades" metricLabel="upgrades" icon={Medal} color="text-blue-500" bgColor="bg-blue-500/10" />
                <TopPerformersCard title="Top 3 Mentors" data={d.top_performers.mentors} metricKey="deposits" metricLabel="deposits" icon={Star} color="text-emerald-500" bgColor="bg-emerald-500/10" />
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
                                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                                        {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip />
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
        </div>
    );
};

/* =========== SUB-COMPONENTS =========== */

const KPICard = ({ title, value, subtitle, pct, icon: Icon, color, iconBg, testId }) => {
    const isPositive = parseFloat(pct) >= 0;
    return (
        <Card className={`${color} border transition-all hover:scale-[1.02] hover:shadow-md`} data-testid={testId}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                        <p className="text-xl font-bold mt-1">{value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
                        {pct !== '0' && pct !== '0.0' && (
                            <div className={`flex items-center gap-1 mt-1 text-[11px] ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                <span>{isPositive ? '+' : ''}{pct}% vs last month</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-2.5 rounded-lg ${iconBg}`}><Icon className="h-5 w-5" /></div>
                </div>
            </CardContent>
        </Card>
    );
};

const MiniCard = ({ title, value, icon: Icon, color, subtitle, testId }) => (
    <Card className="border border-border/50 hover:border-primary/20 transition-all" data-testid={testId}>
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

const ComparisonCard = ({ dept, current, previous, color, icon: Icon }) => {
    const change = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : current > 0 ? 100 : 0;
    const isUp = parseFloat(change) >= 0;
    return (
        <Card className="border border-border/50" data-testid={`comparison-${dept.toLowerCase().replace(/\s/g, '-')}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <p className="text-sm font-medium">{dept}</p>
                    <Badge variant={isUp ? 'default' : 'destructive'} className="ml-auto text-[10px]">
                        {isUp ? '+' : ''}{change}%
                    </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">This Month</p>
                        <p className="text-lg font-bold" style={{ color }}>{formatAED(current)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Last Month</p>
                        <p className="text-lg font-bold text-muted-foreground">{formatAED(previous)}</p>
                    </div>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((current / Math.max(previous, current, 1)) * 100, 100)}%`, backgroundColor: color }} />
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
