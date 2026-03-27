import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Target, UserPlus, Briefcase,
  Clock, ShieldCheck, ShieldAlert, ArrowRight, BarChart3,
  Building2, Award, Zap, RefreshCw,
} from 'lucide-react';

const COLORS = ['#EF3340', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const fmtCur = (n) => `AED ${(n || 0).toLocaleString()}`;

const KPICard = ({ title, value, subtitle, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10', onClick }) => (
  <Card className={`${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/30 transition-all' : ''}`} onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${bgColor}`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </div>
      {onClick && (
        <div className="flex items-center gap-1 mt-2 text-xs text-primary"><ArrowRight className="h-3 w-3" /> View details</div>
      )}
    </CardContent>
  </Card>
);

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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!data) return null;

  const kpis = data.kpis || {};

  return (
    <div className="space-y-6" data-testid="executive-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" /> Executive Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })} — Real-time company snapshot
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-exec-dash">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Commission Approval Status */}
      <div className="flex flex-wrap gap-3">
        {['sales', 'cs'].map(dept => (
          <div key={dept} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${data.commission_approvals?.[dept] === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {data.commission_approvals?.[dept] === 'approved' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {dept.toUpperCase()} Commissions: {data.commission_approvals?.[dept] === 'approved' ? 'Approved' : 'Pending'}
          </div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KPICard title="Revenue This Month" value={fmtCur(kpis.revenue_month)} subtitle={`${kpis.enrolled_month} enrollments`} icon={DollarSign} color="text-emerald-500" bgColor="bg-emerald-500/10" onClick={() => navigate('/sales/dashboard')} />
        <KPICard title="New Leads Today" value={kpis.new_leads_today} subtitle={`${kpis.total_leads_month} this month`} icon={UserPlus} color="text-blue-500" bgColor="bg-blue-500/10" onClick={() => navigate('/sales')} />
        <KPICard title="CS Upgrades" value={kpis.cs_upgrades_month} subtitle={fmtCur(kpis.cs_upgrade_revenue)} icon={TrendingUp} color="text-purple-500" bgColor="bg-purple-500/10" onClick={() => navigate('/cs/dashboard')} />
        <KPICard title="Employees" value={kpis.total_employees} subtitle={`${kpis.active_users} active users`} icon={Users} color="text-rose-500" bgColor="bg-rose-500/10" onClick={() => navigate('/hr/employees')} />
        <KPICard title="Pending Approvals" value={kpis.pending_approvals} subtitle="Needs attention" icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" onClick={() => navigate('/approvals')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Revenue Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.monthly_trend || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [fmtCur(v), 'Revenue']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Course */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Revenue by Course</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.revenue_by_course || []} dataKey="revenue" nameKey="course" cx="50%" cy="50%" outerRadius={90} label={({ course, percent }) => `${(course || '').slice(0, 15)} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {(data.revenue_by_course || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCur(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Sales Agents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Top Sales Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.top_agents || []).map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.deals} deals</p>
                  </div>
                </div>
                <p className="text-sm font-bold font-mono text-emerald-500">{fmtCur(a.revenue)}</p>
              </div>
            ))}
            {(!data.top_agents || data.top_agents.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No data this month</p>
            )}
          </CardContent>
        </Card>

        {/* Department Headcount */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-rose-500" /> Department Headcount</CardTitle>
          </CardHeader>
          <CardContent>
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

        {/* Lead Sources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> Lead Sources (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(data.lead_sources || []).map((s, i) => {
              const maxCount = Math.max(...(data.lead_sources || []).map(x => x.count), 1);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 truncate" title={s.source}>{s.source || 'Unknown'}</span>
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{s.count}</span>
                </div>
              );
            })}
            {(!data.lead_sources || data.lead_sources.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No lead data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
