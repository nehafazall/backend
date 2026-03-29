import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Target, UserPlus,
  Clock, ShieldCheck, ShieldAlert, ArrowRight, BarChart3,
  Building2, Award, Zap, RefreshCw, UserCheck,
  Trophy, Medal, Star, Activity, CalendarCheck, FileWarning,
  GraduationCap, Wallet, Briefcase, Heart, Smile, Brain,
} from 'lucide-react';

const DEPT_COLORS = { sales: '#dc2626', cs: '#3b82f6', mentors: '#10b981' };
const PIE_COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const GENDER_COLORS = { Male: '#3b82f6', Female: '#ec4899', Other: '#8b5cf6' };
const ATT_COLORS = { present: '#10b981', half_day: '#f59e0b', absent: '#ef4444', on_leave: '#6366f1', warning: '#f97316' };

const fmtCur = (n) => `AED ${(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const KPICard = ({ title, value, subtitle, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10', onClick }) => (
  <Card className={`border border-border/50 transition-all hover:scale-[1.01] ${onClick ? 'cursor-pointer hover:border-primary/30' : ''}`} onClick={onClick}>
    <CardContent className="p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className={`text-lg font-bold font-mono mt-0.5 ${color}`}>{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0 ml-2`}><Icon className={`h-4 w-4 ${color}`} /></div>
      </div>
      {onClick && <div className="flex items-center gap-1 mt-1 text-[10px] text-primary"><ArrowRight className="h-2.5 w-2.5" /> View</div>}
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-2.5 text-[11px]">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span>
          <span className="font-medium">{fmtCur(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-border/50 font-semibold">
          <span>Total</span><span>{fmtCur(payload.reduce((s, p) => s + (p.value || 0), 0))}</span>
        </div>
      )}
    </div>
  );
};

const PerformersCard = ({ title, data, metricKey, metricLabel, icon: Icon, color, bgColor }) => (
  <Card className="border border-border/50">
    <CardHeader className="pb-1 pt-2.5 px-3">
      <CardTitle className="text-xs font-medium flex items-center gap-1.5"><Icon className={`h-3.5 w-3.5 ${color}`} /> {title}</CardTitle>
    </CardHeader>
    <CardContent className="px-3 pb-2.5">
      {data.length > 0 ? (
        <div className="space-y-1.5">
          {data.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? `${bgColor} ${color}` : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p[metricKey] || 0} {metricLabel}</p>
              </div>
              <span className="text-xs font-semibold shrink-0">{fmtCur(p.revenue)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-xs py-4">No data this month</p>
      )}
    </CardContent>
  </Card>
);

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMood, setTeamMood] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, moodRes] = await Promise.all([
        apiClient.get('/executive/dashboard'),
        apiClient.get('/executive/team-mood').catch(() => ({ data: { teams: [] } })),
      ]);
      setData(dashRes.data);
      setTeamMood(moodRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const k = data.kpis || {};
  const att = data.attendance || {};
  const attData = [
    { name: 'Present', value: att.present || 0, color: ATT_COLORS.present },
    { name: 'Half Day', value: att.half_day || 0, color: ATT_COLORS.half_day },
    { name: 'Absent', value: att.absent || 0, color: ATT_COLORS.absent },
    { name: 'On Leave', value: att.on_leave || 0, color: ATT_COLORS.on_leave },
    { name: 'Warning', value: att.warning || 0, color: ATT_COLORS.warning },
  ].filter(d => d.value > 0);
  const genderData = Object.entries(data.gender_breakdown || {}).map(([k, v]) => ({ name: k, value: v, fill: GENDER_COLORS[k] || '#94a3b8' }));
  const sp = data.salary_payout || {};

  return (
    <div className="p-3 space-y-3 overflow-auto h-[calc(100vh-4rem)]" data-testid="executive-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-AE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {['sales', 'cs'].map(dept => (
            <div key={dept} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${data.commission_approvals?.[dept] === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {data.commission_approvals?.[dept] === 'approved' ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {dept.toUpperCase()}: {data.commission_approvals?.[dept] === 'approved' ? 'Approved' : 'Pending'}
            </div>
          ))}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchData} data-testid="refresh-exec-dash"><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <KPICard title="Total Revenue" value={fmtCur(k.revenue_month)} subtitle={`${k.enrolled_month} enrollments`} icon={DollarSign} color="text-amber-500" bgColor="bg-amber-500/10" />
        <KPICard title="Sales" value={fmtCur(k.sales_revenue)} icon={TrendingUp} color="text-red-500" bgColor="bg-red-500/10" onClick={() => navigate('/sales/dashboard')} />
        <KPICard title="CS Revenue" value={fmtCur(k.cs_revenue)} subtitle={`${k.cs_upgrades_month} upgrades`} icon={Activity} color="text-blue-500" bgColor="bg-blue-500/10" onClick={() => navigate('/cs/dashboard')} />
        <KPICard title="Academics" value={fmtCur(k.mentor_revenue)} icon={Award} color="text-emerald-500" bgColor="bg-emerald-500/10" onClick={() => navigate('/academics')} />
        <KPICard title="Net Salary" value={fmtCur(sp.total_net || sp.total_gross)} subtitle={`${sp.employee_count} employees`} icon={Wallet} color="text-cyan-500" bgColor="bg-cyan-500/10" />
        <KPICard title="Total Payout" value={fmtCur(sp.total_payout)} subtitle={`Net Salary + Commission`} icon={DollarSign} color="text-violet-500" bgColor="bg-violet-500/10" />
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <KPICard title="New Leads Today" value={k.new_leads_today} subtitle={`${k.total_leads_month} this month`} icon={UserPlus} color="text-violet-500" bgColor="bg-violet-500/10" onClick={() => navigate('/sales')} />
        <KPICard title="Active Pipeline" value={k.active_pipeline} icon={Target} color="text-cyan-500" bgColor="bg-cyan-500/10" />
        <KPICard title="Pending Activations" value={k.pending_activations} icon={Zap} color="text-teal-500" bgColor="bg-teal-500/10" />
        <KPICard title="Employees" value={k.total_employees} icon={Users} color="text-rose-500" bgColor="bg-rose-500/10" onClick={() => navigate('/hr/employees')} />
        <KPICard title="Present Today" value={`${att.present || 0}/${att.total || k.total_employees}`} icon={UserCheck} color="text-emerald-500" bgColor="bg-emerald-500/10" onClick={() => navigate('/hr/attendance')} />
        <KPICard title="Pending Approvals" value={k.pending_approvals + (k.pending_leaves || 0)} subtitle={`${k.pending_leaves || 0} leave req`} icon={Clock} color="text-orange-500" bgColor="bg-orange-500/10" onClick={() => navigate('/approvals')} />
      </div>

      {/* Revenue Trend + Revenue by Dept */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 border border-border/50">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium">Revenue Trend (6 Months)</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={data.monthly_trend || []}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.sales} stopOpacity={0.25}/><stop offset="95%" stopColor={DEPT_COLORS.sales} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.cs} stopOpacity={0.25}/><stop offset="95%" stopColor={DEPT_COLORS.cs} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={DEPT_COLORS.mentors} stopOpacity={0.25}/><stop offset="95%" stopColor={DEPT_COLORS.mentors} stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke={DEPT_COLORS.sales} fill="url(#gS)" strokeWidth={2} />
                <Area type="monotone" dataKey="cs" name="CS" stroke={DEPT_COLORS.cs} fill="url(#gC)" strokeWidth={2} />
                <Area type="monotone" dataKey="mentors" name="Academics" stroke={DEPT_COLORS.mentors} fill="url(#gM)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium">Revenue by Department</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.revenue_split || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip formatter={(v) => fmtCur(v)} />
                <Bar dataKey="value" name="Revenue" radius={[0, 6, 6, 0]}>
                  {(data.revenue_split || []).map((_, i) => <Cell key={i} fill={Object.values(DEPT_COLORS)[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance + Gender + Course Bifurcation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-border/50" data-testid="attendance-chart">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-emerald-500" /> Attendance Today</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            {attData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={attData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" labelLine={false}>
                    {attData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => <span className="text-[10px]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[170px] text-xs text-muted-foreground">No attendance data today</div>}
          </CardContent>
        </Card>

        <Card className="border border-border/50" data-testid="gender-chart">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium">Gender Bifurcation</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" labelLine={false}>
                    {genderData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(v) => <span className="text-[10px]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[170px] text-xs text-muted-foreground">No data</div>}
          </CardContent>
        </Card>

        <Card className="border border-border/50" data-testid="course-bifurcation">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-blue-500" /> Course Bifurcation (New Accounts)</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="space-y-1.5 max-h-[170px] overflow-y-auto">
              {(data.course_bifurcation || []).map((c, i) => {
                const max = Math.max(...(data.course_bifurcation || []).map(x => x.count), 1);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-24 truncate" title={c.course}>{c.course}</span>
                    <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold w-6 text-right">{c.count}</span>
                  </div>
                );
              })}
              {(!data.course_bifurcation || data.course_bifurcation.length === 0) && <div className="text-center text-xs text-muted-foreground py-4">No enrollments this month</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Course + Salary/Commission Payout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border border-border/50" data-testid="revenue-by-course">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium">Revenue by Course</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {(data.revenue_by_course || []).map((c, i) => {
                const max = Math.max(...(data.revenue_by_course || []).map(x => x.revenue), 1);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 truncate" title={c.course}>{c.course}</span>
                    <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c.revenue / max) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <span className="text-[10px] font-mono font-semibold w-20 text-right">{fmtCur(c.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50" data-testid="salary-payout">
          <CardHeader className="pb-1 pt-2.5 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-cyan-500" /> Salary + Commission Payout</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Gross Salary</p>
                <p className="text-base font-bold font-mono text-blue-500 mt-0.5">{fmtCur(sp.total_gross)}</p>
                <p className="text-[10px] text-muted-foreground">{sp.employee_count} employees</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Deductions</p>
                <p className="text-base font-bold font-mono text-orange-500 mt-0.5">{fmtCur(sp.total_deductions)}</p>
                <p className="text-[10px] text-muted-foreground">Half-day + Absent</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Commission</p>
                <p className="text-base font-bold font-mono text-emerald-500 mt-0.5">{fmtCur(sp.total_commission)}</p>
                <p className="text-[10px] text-muted-foreground">All departments</p>
              </div>
              <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                <p className="text-[10px] text-muted-foreground uppercase">Total Payout</p>
                <p className="text-base font-bold font-mono text-violet-500 mt-0.5">{fmtCur(sp.total_payout)}</p>
                <p className="text-[10px] text-muted-foreground">Net + Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers All Departments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="top-performers">
        <PerformersCard title="Top Sales Agents" data={data.top_performers?.sales || []} metricKey="deals" metricLabel="deals" icon={Trophy} color="text-red-500" bgColor="bg-red-500/10" />
        <PerformersCard title="Top CS Agents" data={data.top_performers?.cs || []} metricKey="upgrades" metricLabel="upgrades" icon={Medal} color="text-blue-500" bgColor="bg-blue-500/10" />
        <PerformersCard title="Top Academics" data={data.top_performers?.mentors || []} metricKey="deposits" metricLabel="deposits" icon={Star} color="text-emerald-500" bgColor="bg-emerald-500/10" />
      </div>

      {/* Dept Headcount + Lead Sources + Expiring Docs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-border/50">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-rose-500" /> Department Headcount</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={(data.department_headcount || []).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="department" width={80} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="count" fill="#EF3340" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-blue-500" /> Lead Sources</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2 space-y-1.5">
            {(data.lead_sources || []).map((s, i) => {
              const max = Math.max(...(data.lead_sources || []).map(x => x.count), 1);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-20 truncate">{s.source || 'Unknown'}</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span className="text-[10px] font-mono w-6 text-right">{s.count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border/50" data-testid="expiring-docs">
          <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium flex items-center gap-1.5"><FileWarning className="h-3.5 w-3.5 text-orange-500" /> Documents Expiring (30 Days)</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2">
            {(data.expiring_documents || []).length > 0 ? (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {data.expiring_documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{d.employee}</p>
                      <p className="text-[10px] text-muted-foreground">{d.document}</p>
                    </div>
                    <Badge variant={d.days_left <= 7 ? 'destructive' : 'secondary'} className="text-[9px] ml-2 shrink-0">
                      {d.days_left}d left
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
                <FileWarning className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-xs">No expiring documents</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Add employee documents in HR to track</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Mood Scores (from Claret AI) */}
      {teamMood?.teams?.length > 0 && (
        <div className="space-y-2" data-testid="team-mood-section">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-semibold">Team Mood Pulse</h2>
            <Badge variant="outline" className="text-[9px] ml-1">Last 30 Days</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {teamMood.teams.map((team) => {
              const mood = team.avg_mood;
              const moodColor = !mood ? 'text-muted-foreground' : mood >= 7 ? 'text-emerald-600' : mood >= 5 ? 'text-amber-600' : 'text-red-600';
              const moodBg = !mood ? 'bg-muted/30' : mood >= 7 ? 'bg-emerald-500/5 border-emerald-500/20' : mood >= 5 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20';
              const moodIcon = !mood ? '---' : mood >= 8 ? '🔥' : mood >= 6 ? '😊' : mood >= 4 ? '😐' : '😓';
              return (
                <Card key={team.team_id} className={`border ${moodBg} transition-all hover:scale-[1.01]`} data-testid={`team-mood-${team.team_id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold truncate flex-1" title={team.team_name}>{team.team_name}</p>
                      <span className="text-lg ml-1">{moodIcon}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-2xl font-bold font-mono ${moodColor}`}>{mood ? mood.toFixed(1) : 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground">{team.active_users}/{team.member_count} active</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        {team.avg_energy != null && <p className="text-[9px] text-muted-foreground">Energy: <span className="font-mono font-medium">{team.avg_energy}</span></p>}
                        {team.avg_motivation != null && <p className="text-[9px] text-muted-foreground">Drive: <span className="font-mono font-medium">{team.avg_motivation}</span></p>}
                        {team.avg_stress != null && <p className="text-[9px] text-muted-foreground">Stress: <span className="font-mono font-medium text-red-500">{team.avg_stress}</span></p>}
                      </div>
                    </div>
                    {/* Member mini-list */}
                    {team.members?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30 space-y-0.5">
                        {team.members.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="truncate text-muted-foreground">{m.name?.split(' ')[0]}</span>
                            <span className={`font-mono font-medium ${m.avg_mood ? (m.avg_mood >= 7 ? 'text-emerald-600' : m.avg_mood >= 5 ? 'text-amber-600' : 'text-red-500') : 'text-muted-foreground'}`}>
                              {m.avg_mood ? m.avg_mood.toFixed(1) : '—'}
                            </span>
                          </div>
                        ))}
                        {team.members.length > 3 && <p className="text-[9px] text-muted-foreground text-center">+{team.members.length - 3} more</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Enrollments */}
      <Card className="border border-border/50">
        <CardHeader className="pb-1 pt-2.5 px-3"><CardTitle className="text-xs font-medium">Recent Enrollments</CardTitle></CardHeader>
        <CardContent className="px-3 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {(data.recent_enrollments || []).map((e, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                <p className="text-xs font-medium truncate">{e.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{e.course || 'N/A'}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{e.agent?.split(' ')[0]}</span>
                  <span className="text-xs font-semibold text-emerald-600">{fmtCur(e.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
