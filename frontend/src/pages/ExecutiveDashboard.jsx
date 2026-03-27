import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Target, UserPlus, Briefcase,
  Clock, ShieldCheck, ShieldAlert, ArrowRight, BarChart3,
  Building2, Award, Zap, RefreshCw, UserCheck, UserX,
  Trophy, Medal, Star, Activity, CalendarCheck, FileWarning,
  GraduationCap, Wallet, CreditCard,
} from 'lucide-react';

const DEPT_COLORS = { sales: '#dc2626', cs: '#3b82f6', mentors: '#10b981' };
const PIE_COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const GENDER_COLORS = { Male: '#3b82f6', Female: '#ec4899', Other: '#8b5cf6' };
const ATTENDANCE_COLORS = { present: '#10b981', half_day: '#f59e0b', absent: '#ef4444', on_leave: '#6366f1', warning: '#f97316' };

const fmtCur = (n) => `AED ${(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const KPICard = ({ title, value, subtitle, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10', onClick }) => (
  <Card className={`border border-border/50 transition-all hover:scale-[1.02] hover:shadow-md ${onClick ? 'cursor-pointer hover:border-primary/30' : ''}`} onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={`text-xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${bgColor}`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </div>
      {onClick && <div className="flex items-center gap-1 mt-1.5 text-[10px] text-primary"><ArrowRight className="h-2.5 w-2.5" /> View</div>}
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
          <span className="font-medium">{fmtCur(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-6 pt-1 mt-1 border-t border-border/50 font-semibold">
          <span>Total</span><span>{fmtCur(payload.reduce((s, p) => s + (p.value || 0), 0))}</span>
        </div>
      )}
    </div>
  );
};

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/executive/dashboard');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const kpis = data.kpis || {};
  const att = data.attendance || {};
  const attTotal = att.total || 1;
  const attData = [
    { name: 'Present', value: att.present || 0, color: ATTENDANCE_COLORS.present },
    { name: 'Half Day', value: att.half_day || 0, color: ATTENDANCE_COLORS.half_day },
    { name: 'Absent', value: att.absent || 0, color: ATTENDANCE_COLORS.absent },
    { name: 'On Leave', value: att.on_leave || 0, color: ATTENDANCE_COLORS.on_leave },
    { name: 'Warning', value: att.warning || 0, color: ATTENDANCE_COLORS.warning },
  ].filter(d => d.value > 0);
  
  const genderData = Object.entries(data.gender_breakdown || {}).map(([k, v]) => ({
    name: k, value: v, fill: GENDER_COLORS[k] || '#94a3b8'
  }));

  return (
    <div className="p-4 space-y-4 overflow-auto h-[calc(100vh-4rem)]" data-testid="executive-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" /> Executive Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-AE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['sales', 'cs'].map(dept => (
            <div key={dept} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${data.commission_approvals?.[dept] === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {data.commission_approvals?.[dept] === 'approved' ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {dept.toUpperCase()} Commissions: {data.commission_approvals?.[dept] === 'approved' ? 'Approved' : 'Pending'}
            </div>
          ))}
          <Button variant="ghost" size="icon" onClick={fetchData} data-testid="refresh-exec-dash"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Revenue KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Total Revenue" value={fmtCur(kpis.revenue_month)} subtitle={`${kpis.enrolled_month} enrollments`} icon={DollarSign} color="text-amber-500" bgColor="bg-amber-500/10" />
        <KPICard title="Sales Revenue" value={fmtCur(kpis.sales_revenue)} icon={TrendingUp} color="text-red-500" bgColor="bg-red-500/10" onClick={() => navigate('/sales/dashboard')} />
        <KPICard title="CS Revenue" value={fmtCur(kpis.cs_revenue)} subtitle={`${kpis.cs_upgrades_month} upgrades`} icon={Activity} color="text-blue-500" bgColor="bg-blue-500/10" onClick={() => navigate('/cs/dashboard')} />
        <KPICard title="Academics Revenue" value={fmtCur(kpis.mentor_revenue)} icon={Award} color="text-emerald-500" bgColor="bg-emerald-500/10" onClick={() => navigate('/academics')} />
        <KPICard title="Pending Approvals" value={kpis.pending_approvals + (kpis.pending_leaves || 0)} subtitle={`${kpis.pending_leaves || 0} leave requests`} icon={Clock} color="text-orange-500" bgColor="bg-orange-500/10" onClick={() => navigate('/approvals')} />
      </div>

      {/* Operational KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="New Leads Today" value={kpis.new_leads_today} subtitle={`${kpis.total_leads_month} this month`} icon={UserPlus} color="text-violet-500" bgColor="bg-violet-500/10" onClick={() => navigate('/sales')} />
        <KPICard title="Active Pipeline" value={kpis.active_pipeline} icon={Target} color="text-cyan-500" bgColor="bg-cyan-500/10" onClick={() => navigate('/sales')} />
        <KPICard title="Pending Activations" value={kpis.pending_activations} icon={Zap} color="text-teal-500" bgColor="bg-teal-500/10" onClick={() => navigate('/cs')} />
        <KPICard title="Employees" value={kpis.total_employees} subtitle={`${kpis.active_users} active users`} icon={Users} color="text-rose-500" bgColor="bg-rose-500/10" onClick={() => navigate('/hr/employees')} />
        <KPICard title="Present Today" value={`${att.present || 0}/${attTotal}`} subtitle={`${attTotal > 0 ? Math.round(((att.present || 0) / attTotal) * 100) : 0}% attendance`} icon={UserCheck} color="text-emerald-500" bgColor="bg-emerald-500/10" onClick={() => navigate('/hr/attendance')} />
      </div>

      {/* Revenue Trend + Revenue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Monthly Revenue Trend (All Departments)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.monthly_trend || []}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.sales} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.sales} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gCS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.cs} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.cs} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gMentors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.mentors} stopOpacity={0.3}/><stop offset="95%" stopColor={DEPT_COLORS.mentors} stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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

        <Card className="border border-border/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.revenue_split || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={95} />
                <Tooltip formatter={(v) => fmtCur(v)} />
                <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]}>
                  {(data.revenue_split || []).map((_, i) => <Cell key={i} fill={Object.values(DEPT_COLORS)[i] || PIE_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance + Revenue by Course + Gender */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Donut */}
        <Card className="border border-border/50" data-testid="attendance-chart">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-500" /> Attendance Today
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {attData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={attData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}>
                    {attData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No attendance data for today</div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Course */}
        <Card className="border border-border/50" data-testid="revenue-by-course">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500" /> Revenue by Course
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {(data.revenue_by_course || []).map((c, i) => {
                const maxRev = Math.max(...(data.revenue_by_course || []).map(x => x.revenue), 1);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 truncate" title={c.course}>{c.course}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.revenue / maxRev) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold w-20 text-right">{fmtCur(c.revenue)}</span>
                  </div>
                );
              })}
              {(!data.revenue_by_course || data.revenue_by_course.length === 0) && (
                <div className="text-center text-muted-foreground text-sm py-4">No course data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gender Bifurcation */}
        <Card className="border border-border/50" data-testid="gender-chart">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Gender Bifurcation</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}>
                    {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers All Departments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="top-performers">
        <PerformersCard title="Top Sales Agents" data={data.top_performers?.sales || []} metricKey="deals" metricLabel="deals" icon={Trophy} color="text-red-500" bgColor="bg-red-500/10" />
        <PerformersCard title="Top CS Agents" data={data.top_performers?.cs || []} metricKey="upgrades" metricLabel="upgrades" icon={Medal} color="text-blue-500" bgColor="bg-blue-500/10" />
        <PerformersCard title="Top Academics" data={data.top_performers?.mentors || []} metricKey="deposits" metricLabel="deposits" icon={Star} color="text-emerald-500" bgColor="bg-emerald-500/10" />
      </div>

      {/* Department Headcount + Lead Sources + Recent Enrollments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-rose-500" /> Department Headcount</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(data.department_headcount || []).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="department" width={90} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="count" fill="#EF3340" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> Lead Sources (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {(data.lead_sources || []).map((s, i) => {
              const maxCount = Math.max(...(data.lead_sources || []).map(x => x.count), 1);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 truncate" title={s.source}>{s.source || 'Unknown'}</span>
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span className="text-[10px] font-mono w-8 text-right">{s.count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {(data.recent_enrollments || []).length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.recent_enrollments.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{e.course || 'N/A'} &middot; {e.agent || 'N/A'}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 ml-2 shrink-0">{fmtCur(e.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No recent enrollments</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const PerformersCard = ({ title, data, metricKey, metricLabel, icon: Icon, color, bgColor }) => (
  <Card className="border border-border/50">
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
                <p className="text-[10px] text-muted-foreground">{p[metricKey] || 0} {metricLabel}</p>
              </div>
              <span className="text-xs font-semibold">{fmtCur(p.revenue)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">No data this month</div>
      )}
    </CardContent>
  </Card>
);
