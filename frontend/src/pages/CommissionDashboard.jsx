import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DollarSign, TrendingUp, Clock, CheckCircle, Users, ArrowUpRight, Target, Award, ShieldCheck, ShieldAlert, Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fmtCur = (n) => `AED ${(n || 0).toLocaleString()}`;
const months = () => {
    const now = new Date();
    const opts = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({ value: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
    }
    return opts;
};

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'text-primary', bgColor = 'bg-primary/10' }) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${bgColor}`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </div>
        </CardContent>
    </Card>
);

const ScatterChart = ({ data, agentName }) => {
    if (!data?.length) return null;
    const maxVal = Math.max(...data.map(d => d.net_pay), 1);
    const h = 220, w = 600, pad = { t: 20, r: 20, b: 40, l: 60 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;

    const points = (key, color) => data.map((d, i) => {
        const x = pad.l + (i / Math.max(data.length - 1, 1)) * plotW;
        const y = pad.t + plotH - (d[key] / maxVal) * plotH;
        return { x, y, val: d[key], label: d.label };
    });

    const commPts = points('commission', '#10b981');
    const payPts = points('net_pay', '#3b82f6');
    const pathStr = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {agentName || 'Commission'} — Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 240 }}>
                    {/* Grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map(f => (
                        <g key={f}>
                            <line x1={pad.l} y1={pad.t + plotH * (1 - f)} x2={w - pad.r} y2={pad.t + plotH * (1 - f)} stroke="currentColor" strokeOpacity={0.08} />
                            <text x={pad.l - 8} y={pad.t + plotH * (1 - f) + 4} textAnchor="end" fill="currentColor" fillOpacity={0.4} fontSize={9}>{Math.round(maxVal * f).toLocaleString()}</text>
                        </g>
                    ))}
                    {/* Lines */}
                    <path d={pathStr(payPts)} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />
                    <path d={pathStr(commPts)} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6,3" />
                    {/* Dots */}
                    {payPts.map((p, i) => <circle key={`p${i}`} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />)}
                    {commPts.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={4} fill="#10b981" />)}
                    {/* Labels */}
                    {data.map((d, i) => {
                        const x = pad.l + (i / Math.max(data.length - 1, 1)) * plotW;
                        return <text key={i} x={x} y={h - 8} textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize={9}>{d.label}</text>;
                    })}
                    {/* Legend */}
                    <circle cx={pad.l + 10} cy={h - 28} r={4} fill="#3b82f6" /><text x={pad.l + 18} y={h - 25} fill="currentColor" fillOpacity={0.6} fontSize={9}>Net Pay (Salary + Commission)</text>
                    <circle cx={pad.l + 200} cy={h - 28} r={4} fill="#10b981" /><text x={pad.l + 208} y={h - 25} fill="currentColor" fillOpacity={0.6} fontSize={9}>Commission Only</text>
                </svg>
            </CardContent>
        </Card>
    );
};

export default function CommissionDashboard() {
    const { user } = useAuth();
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState(null);
    const [scatterData, setScatterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drillDept, setDrillDept] = useState(null);
    const [drillData, setDrillData] = useState(null);
    const [drillLoading, setDrillLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [txnFilter, setTxnFilter] = useState('all');
    const [txnLoading, setTxnLoading] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [editCommission, setEditCommission] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [generating, setGenerating] = useState(false);
    const [myTxns, setMyTxns] = useState([]);
    const monthOpts = months();

    const isCEO = ['super_admin', 'coo'].includes(user?.role);
    const isTL = user?.role === 'team_leader';
    const isSales = ['sales_executive', 'team_leader'].includes(user?.role);
    const isCS = ['cs_agent', 'cs_head'].includes(user?.role);
    const isCSHead = user?.role === 'cs_head';

    useEffect(() => { fetchData(); }, [month]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const promises = [
                apiClient.get(`/commissions/dashboard?month=${month}`),
                apiClient.get(`/commissions/scatter-data?months=6`),
            ];
            if (!isCEO) promises.push(apiClient.get(`/commissions/transactions?month=${month}`));
            const results = await Promise.all(promises);
            setData(results[0].data);
            setScatterData(results[1].data);
            if (results[2]) setMyTxns(results[2].data.transactions || []);
        } catch (e) { toast.error('Failed to load commission data'); console.error(e); }
        finally { setLoading(false); }
    };

    const openDrill = async (dept) => {
        setDrillDept(dept);
        setDrillLoading(true);
        try {
            const res = await apiClient.get(`/commissions/ceo/drill?dept=${dept}&month=${month}`);
            setDrillData(res.data);
        } catch { toast.error('Failed to load drill data'); }
        finally { setDrillLoading(false); }
    };

    const handleApproval = async (department, action) => {
        setApproving(true);
        try {
            await apiClient.post('/commissions/approve', { department, month, action });
            toast.success(`${department.toUpperCase()} commissions ${action === 'approve' ? 'approved' : 'revoked'} for ${monthOpts.find(o => o.value === month)?.label}`);
            fetchData();
        } catch (e) { toast.error('Failed to update approval'); }
        finally { setApproving(false); }
    };

    const getApprovalStatus = (dept) => data?.approvals?.[dept]?.status === 'approved';
    const userApprovalStatus = data?.approval_status;

    const fetchTransactions = async (dept) => {
        setTxnLoading(true);
        try {
            const params = new URLSearchParams({ month });
            if (dept && dept !== 'all') params.set('department', dept);
            const res = await apiClient.get(`/commissions/transactions?${params}`);
            setTransactions(res.data.transactions || []);
        } catch { toast.error('Failed to load transactions'); }
        finally { setTxnLoading(false); }
    };

    const approveTxn = async (txnId) => {
        try {
            await apiClient.post(`/commissions/transactions/${txnId}/approve`);
            setTransactions(prev => prev.map(t => t.id === txnId ? { ...t, status: 'approved' } : t));
            toast.success('Transaction approved');
        } catch { toast.error('Failed to approve'); }
    };

    const bulkApprove = async (dept) => {
        try {
            const body = { month };
            if (dept && dept !== 'all') body.department = dept;
            const res = await apiClient.post('/commissions/transactions/bulk-approve', body);
            toast.success(res.data.message);
            fetchTransactions(txnFilter);
        } catch { toast.error('Failed to bulk approve'); }
    };

    const saveEditTxn = async () => {
        if (!editingTxn) return;
        try {
            await apiClient.put(`/commissions/transactions/${editingTxn.id}`, {
                final_commission: parseFloat(editCommission),
                ceo_notes: editNotes,
                approve: true,
            });
            setTransactions(prev => prev.map(t => t.id === editingTxn.id ? { ...t, final_commission: parseFloat(editCommission), ceo_notes: editNotes, status: 'approved' } : t));
            setEditingTxn(null);
            toast.success('Commission updated & approved');
        } catch { toast.error('Failed to update'); }
    };

    const generateTransactions = async () => {
        setGenerating(true);
        try {
            const res = await apiClient.post('/commissions/generate-transactions', { month });
            toast.success(res.data.message);
            fetchTransactions(txnFilter);
        } catch { toast.error('Failed to generate transactions'); }
        finally { setGenerating(false); }
    };

    if (loading) return <div className="text-center py-12 text-muted-foreground">Loading commission data...</div>;
    if (!data) return null;

    const my = data.my_commission || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-emerald-500" /> Commission Dashboard</h2>
                    <p className="text-muted-foreground text-sm mt-1">Track earnings, pipeline & benchmarks</p>
                </div>
                <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{monthOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            {/* === SALES EXECUTIVE / TEAM LEADER VIEW === */}
            {isSales && (
                <>
                    {/* Approval Status Banner */}
                    {userApprovalStatus === 'approved' ? (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2" data-testid="approval-status-approved">
                            <ShieldCheck className="h-4 w-4" /> Commissions for this month have been <strong>approved by CEO</strong>. Your earned commissions are confirmed.
                        </div>
                    ) : (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2" data-testid="approval-status-pending">
                            <ShieldAlert className="h-4 w-4" /> Commissions for this month are <strong>pending CEO approval</strong>. Earned amounts will be confirmed once approved.
                        </div>
                    )}

                    {/* My Transactions */}
                    {myTxns.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> My Transactions ({myTxns.length})</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right">Commission</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {myTxns.map(txn => (
                                            <TableRow key={txn.id} className={txn.status === 'approved' ? 'bg-emerald-500/5' : ''}>
                                                <TableCell className="text-sm">{txn.student_name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{txn.course_matched}</TableCell>
                                                <TableCell className="text-right text-sm">{fmtCur(txn.amount)}</TableCell>
                                                <TableCell className="text-right font-semibold text-sm">
                                                    {txn.final_commission !== txn.original_commission ? (
                                                        <span><span className="line-through text-muted-foreground mr-1">{fmtCur(txn.original_commission)}</span>{fmtCur(txn.final_commission)}</span>
                                                    ) : fmtCur(txn.final_commission)}
                                                </TableCell>
                                                <TableCell>
                                                    {txn.status === 'approved' ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Approved</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/10 text-amber-600 text-xs">Pending</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {userApprovalStatus === 'approved' ? (
                            <StatCard title="Approved Commission" value={fmtCur(data.approved_commission)} subtitle="CEO approved" icon={ShieldCheck} color="text-emerald-500" bgColor="bg-emerald-500/10" />
                        ) : (
                            <StatCard title="Awaiting Approval" value={fmtCur(data.pending_approval_commission)} subtitle="Pending CEO approval" icon={ShieldAlert} color="text-amber-500" bgColor="bg-amber-500/10" />
                        )}
                        <StatCard title="Pipeline Pending" value={fmtCur(my.pending_commission)} subtitle={`${my.pipeline_count || 0} in pipeline${!my.benchmark_crossed && my.deals_closed ? ' + below 18K' : ''}`} icon={Clock} color="text-orange-500" bgColor="bg-orange-500/10" />
                        <StatCard title="Revenue Achieved" value={fmtCur(my.total_revenue)} subtitle={`${my.deals_closed} deals closed`} icon={Target} color="text-blue-500" bgColor="bg-blue-500/10" />
                        {isTL && (
                            userApprovalStatus === 'approved' ? (
                                <StatCard title="TL Commission (Approved)" value={fmtCur(data.approved_tl_commission)} subtitle="From team sales" icon={Award} color="text-purple-500" bgColor="bg-purple-500/10" />
                            ) : (
                                <StatCard title="TL Commission (Pending)" value={fmtCur(data.pending_approval_tl_commission)} subtitle="Awaiting CEO approval" icon={Award} color="text-purple-400" bgColor="bg-purple-400/10" />
                            )
                        )}
                        {!isTL && <StatCard title="18K Benchmark" value={my.benchmark_crossed ? 'Crossed' : `${Math.round(((my.total_revenue || 0) / SALES_BENCHMARK_AED) * 100)}%`} subtitle={my.benchmark_crossed ? 'All commissions unlocked' : `Need ${fmtCur(SALES_BENCHMARK_AED - (my.total_revenue || 0))} more`} icon={Target} color={my.benchmark_crossed ? "text-emerald-500" : "text-red-500"} bgColor={my.benchmark_crossed ? "bg-emerald-500/10" : "bg-red-500/10"} />}
                    </div>

                    {!my.benchmark_crossed && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
                            <strong>Benchmark Alert:</strong> You need {fmtCur(18000 - (my.total_revenue || 0))} more in revenue to unlock your earned commissions. Keep pushing!
                        </div>
                    )}

                    {/* TL Team View */}
                    {isTL && data.team_commissions?.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Team Commission Breakdown</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Deals</TableHead><TableHead className="text-right">Earned</TableHead><TableHead className="text-right">Pending</TableHead><TableHead>Benchmark</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {data.team_commissions.map((t, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{t.agent_name}</TableCell>
                                                <TableCell className="text-right font-mono">{fmtCur(t.total_revenue)}</TableCell>
                                                <TableCell className="text-right">{t.deals_closed}</TableCell>
                                                <TableCell className="text-right font-mono text-emerald-500">{fmtCur(t.earned_commission)}</TableCell>
                                                <TableCell className="text-right font-mono text-amber-500">{fmtCur(t.pending_commission)}</TableCell>
                                                <TableCell>{t.benchmark_crossed ? <Badge className="bg-emerald-500 text-white text-xs">Crossed</Badge> : <Badge variant="outline" className="text-xs text-red-500">Below 18K</Badge>}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* === CS AGENT / CS HEAD VIEW === */}
            {isCS && (
                <>
                    {/* Approval Status Banner */}
                    {userApprovalStatus === 'approved' ? (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2" data-testid="cs-approval-status-approved">
                            <ShieldCheck className="h-4 w-4" /> Commissions for this month have been <strong>approved by CEO</strong>. Your earned commissions are confirmed.
                        </div>
                    ) : (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2" data-testid="cs-approval-status-pending">
                            <ShieldAlert className="h-4 w-4" /> Commissions for this month are <strong>pending CEO approval</strong>. Earned amounts will be confirmed once approved.
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {userApprovalStatus === 'approved' ? (
                            <StatCard title="Approved Commission" value={fmtCur(data.approved_commission)} subtitle={`${my.upgrades_closed} upgrades closed`} icon={ShieldCheck} color="text-emerald-500" bgColor="bg-emerald-500/10" />
                        ) : (
                            <StatCard title="Awaiting Approval" value={fmtCur(data.pending_approval_commission)} subtitle={`${my.upgrades_closed} upgrades closed`} icon={ShieldAlert} color="text-amber-500" bgColor="bg-amber-500/10" />
                        )}
                        <StatCard title="Pipeline Pending" value={fmtCur(my.pending_commission)} subtitle={`${my.pipeline_count} in pipeline`} icon={Clock} color="text-orange-500" bgColor="bg-orange-500/10" />
                        {isCSHead && (
                            userApprovalStatus === 'approved' ? (
                                <StatCard title="CS Head (Approved)" value={fmtCur(data.approved_cs_head_commission)} subtitle="From all team upgrades" icon={Award} color="text-purple-500" bgColor="bg-purple-500/10" />
                            ) : (
                                <StatCard title="CS Head (Pending)" value={fmtCur(data.pending_approval_cs_head_commission)} subtitle="Awaiting CEO approval" icon={Award} color="text-purple-400" bgColor="bg-purple-400/10" />
                            )
                        )}
                        {!isCSHead && <StatCard title="Upgrades Closed" value={my.upgrades_closed} subtitle="This month" icon={TrendingUp} color="text-blue-500" bgColor="bg-blue-500/10" />}
                        {!isCSHead && <StatCard title="Pipeline" value={my.pipeline_count} subtitle="Pending upgrades" icon={ArrowUpRight} color="text-orange-500" bgColor="bg-orange-500/10" />}
                    </div>

                    {isCSHead && data.team_commissions?.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> CS Team Commission</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead className="text-right">Upgrades</TableHead><TableHead className="text-right">Earned</TableHead><TableHead className="text-right">Pending</TableHead><TableHead className="text-right">Pipeline</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {data.team_commissions.map((t, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{t.agent_name}</TableCell>
                                                <TableCell className="text-right">{t.upgrades_closed}</TableCell>
                                                <TableCell className="text-right font-mono text-emerald-500">{fmtCur(t.earned_commission)}</TableCell>
                                                <TableCell className="text-right font-mono text-amber-500">{fmtCur(t.pending_commission)}</TableCell>
                                                <TableCell className="text-right">{t.pipeline_count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* === CEO VIEW === */}
            {isCEO && (
                <Tabs defaultValue="sales">
                    <TabsList>
                        <TabsTrigger value="sales">Sales Commissions</TabsTrigger>
                        <TabsTrigger value="cs">CS Commissions</TabsTrigger>
                        <TabsTrigger value="transactions" onClick={() => fetchTransactions(txnFilter)}>Approve Transactions</TabsTrigger>
                        <TabsTrigger value="pools">CEO Pools</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard title="Sales Earned" value={fmtCur(data.total_sales_earned)} icon={CheckCircle} color="text-emerald-500" bgColor="bg-emerald-500/10" />
                            <StatCard title="Sales Pending" value={fmtCur(data.total_sales_pending)} icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" />
                            <StatCard title="TL Earned" value={fmtCur(data.total_tl_earned)} icon={Award} color="text-purple-500" bgColor="bg-purple-500/10" />
                            <StatCard title="SM / CEO Pool" value={fmtCur(data.sm_bonus_pool)} icon={DollarSign} color="text-blue-500" bgColor="bg-blue-500/10" />
                        </div>
                        {/* CEO Approval Control */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card" data-testid="ceo-sales-approval-control">
                            <div className="flex items-center gap-2">
                                {getApprovalStatus('sales') ? (
                                    <><ShieldCheck className="h-5 w-5 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">Sales commissions approved for {monthOpts.find(o => o.value === month)?.label}</span></>
                                ) : (
                                    <><ShieldAlert className="h-5 w-5 text-amber-500" /><span className="text-sm font-medium text-amber-600">Sales commissions pending approval</span></>
                                )}
                            </div>
                            {getApprovalStatus('sales') ? (
                                <Button variant="outline" size="sm" onClick={() => handleApproval('sales', 'revoke')} disabled={approving} data-testid="revoke-sales-btn" className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                                    Revoke Approval
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleApproval('sales', 'approve')} disabled={approving} data-testid="approve-sales-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <ShieldCheck className="h-4 w-4 mr-1" /> Approve Sales Commissions
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDrill('sales')} data-testid="drill-sales-commission">
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> View Full Sales Commission Table
                        </Button>
                    </TabsContent>

                    <TabsContent value="cs" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard title="CS Earned" value={fmtCur(data.total_cs_earned)} icon={CheckCircle} color="text-emerald-500" bgColor="bg-emerald-500/10" />
                            <StatCard title="CS Pending" value={fmtCur(data.total_cs_pending)} icon={Clock} color="text-amber-500" bgColor="bg-amber-500/10" />
                            <StatCard title="CS Head Earned" value={fmtCur(data.total_cs_head_earned)} icon={Award} color="text-purple-500" bgColor="bg-purple-500/10" />
                            <StatCard title="Mentor Pool" value={fmtCur(data.mentor_pool)} subtitle="Edwin — Cash bonus (confidential)" icon={DollarSign} color="text-red-500" bgColor="bg-red-500/10" />
                        </div>
                        {/* CEO Approval Control */}
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card" data-testid="ceo-cs-approval-control">
                            <div className="flex items-center gap-2">
                                {getApprovalStatus('cs') ? (
                                    <><ShieldCheck className="h-5 w-5 text-emerald-500" /><span className="text-sm font-medium text-emerald-600">CS commissions approved for {monthOpts.find(o => o.value === month)?.label}</span></>
                                ) : (
                                    <><ShieldAlert className="h-5 w-5 text-amber-500" /><span className="text-sm font-medium text-amber-600">CS commissions pending approval</span></>
                                )}
                            </div>
                            {getApprovalStatus('cs') ? (
                                <Button variant="outline" size="sm" onClick={() => handleApproval('cs', 'revoke')} disabled={approving} data-testid="revoke-cs-btn" className="text-red-500 border-red-500/30 hover:bg-red-500/10">
                                    Revoke Approval
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => handleApproval('cs', 'approve')} disabled={approving} data-testid="approve-cs-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <ShieldCheck className="h-4 w-4 mr-1" /> Approve CS Commissions
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDrill('cs')} data-testid="drill-cs-commission">
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> View Full CS Commission Table
                        </Button>
                    </TabsContent>


                    {/* === TRANSACTIONS APPROVAL TAB === */}
                    <TabsContent value="transactions" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Select value={txnFilter} onValueChange={(v) => { setTxnFilter(v); fetchTransactions(v); }}>
                                    <SelectTrigger className="w-[160px] h-8" data-testid="txn-dept-filter"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="cs">Customer Service</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Badge variant="outline" className="text-xs">{transactions.filter(t => t.status === 'pending').length} pending</Badge>
                                <Badge variant="outline" className="text-xs text-emerald-600">{transactions.filter(t => t.status === 'approved').length} approved</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={generateTransactions} disabled={generating} data-testid="generate-txns-btn">
                                    {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null} Generate Transactions
                                </Button>
                                <Button size="sm" onClick={() => bulkApprove(txnFilter)} disabled={!transactions.some(t => t.status === 'pending')} data-testid="bulk-approve-btn" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve All Pending
                                </Button>
                            </div>
                        </div>

                        {txnLoading ? (
                            <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading transactions...</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No transactions found. Click "Generate Transactions" to scan enrolled leads and CS upgrades.</div>
                        ) : (
                            <Card>
                                <CardContent className="p-0">
                                    <div className="max-h-[500px] overflow-auto">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-card z-10">
                                                <TableRow>
                                                    <TableHead className="w-[140px]">Agent</TableHead>
                                                    <TableHead className="w-[90px]">Type</TableHead>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead className="text-right w-[90px]">Amount</TableHead>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead className="text-right w-[100px]">Commission</TableHead>
                                                    <TableHead className="w-[80px]">Status</TableHead>
                                                    <TableHead className="text-right w-[130px]">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions.map(txn => (
                                                    <TableRow key={txn.id} className={txn.status === 'approved' ? 'bg-emerald-500/5' : ''}>
                                                        <TableCell className="font-medium text-sm">{txn.agent_name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs capitalize">
                                                                {txn.commission_type === 'team_leader' ? 'TL' : txn.commission_type === 'cs_agent' ? 'CS' : 'SE'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{txn.student_name}{txn.from_agent ? <span className="text-xs text-muted-foreground ml-1">(via {txn.from_agent})</span> : null}</TableCell>
                                                        <TableCell className="text-right text-sm">{fmtCur(txn.amount)}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{txn.course_matched}</TableCell>
                                                        <TableCell className="text-right font-semibold text-sm">
                                                            {txn.final_commission !== txn.original_commission ? (
                                                                <span><span className="line-through text-muted-foreground mr-1">{fmtCur(txn.original_commission)}</span>{fmtCur(txn.final_commission)}</span>
                                                            ) : fmtCur(txn.final_commission)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {txn.status === 'approved' ? (
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Approved</Badge>
                                                            ) : (
                                                                <Badge className="bg-amber-500/10 text-amber-600 text-xs">Pending</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {txn.status === 'pending' && (
                                                                    <>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10" onClick={() => approveTxn(txn.id)} data-testid={`approve-txn-${txn.id}`} title="Approve">
                                                                            <Check className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-500/10" onClick={() => { setEditingTxn(txn); setEditCommission(String(txn.final_commission)); setEditNotes(txn.ceo_notes || ''); }} data-testid={`edit-txn-${txn.id}`} title="Edit & Approve">
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {txn.ceo_notes && <span className="text-xs text-muted-foreground" title={txn.ceo_notes}>*</span>}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="pools" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-blue-500/30">
                                <CardContent className="p-5 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">SM / CEO Bonus Pool</p>
                                    <p className="text-3xl font-bold font-mono text-blue-500 mt-2">{fmtCur(data.sm_bonus_pool)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">From all sales this month</p>
                                </CardContent>
                            </Card>
                            <Card className="border-red-500/30">
                                <CardContent className="p-5 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Mentor Pool (Edwin)</p>
                                    <p className="text-3xl font-bold font-mono text-red-500 mt-2">{fmtCur(data.mentor_pool)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Cash bonus — confidential</p>
                                </CardContent>
                            </Card>
                            <Card className="border-emerald-500/30">
                                <CardContent className="p-5 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Total Commission Outflow</p>
                                    <p className="text-3xl font-bold font-mono text-emerald-500 mt-2">{fmtCur((data.total_sales_earned || 0) + (data.total_tl_earned || 0) + (data.total_cs_earned || 0) + (data.total_cs_head_earned || 0))}</p>
                                    <p className="text-xs text-muted-foreground mt-1">All earned commissions combined</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {/* Scatter Chart */}
            {scatterData && <ScatterChart data={scatterData.data} agentName={scatterData.agent_name} />}

            {/* Drill-Down Dialog */}
            <Dialog open={!!drillDept} onOpenChange={() => setDrillDept(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{drillDept === 'sales' ? 'Sales' : 'CS'} Commission Breakdown — {monthOpts.find(o => o.value === month)?.label}</DialogTitle>
                    </DialogHeader>
                    {drillLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : drillData && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">Sr</TableHead>
                                    <TableHead>{drillDept === 'sales' ? 'Sales Executive' : 'CS Agent'}</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">{drillDept === 'sales' ? 'Achieved' : 'Upgrades'}</TableHead>
                                    <TableHead className="text-right">Earned</TableHead>
                                    <TableHead className="text-right">Pending</TableHead>
                                    {drillDept === 'sales' && <TableHead>Benchmark</TableHead>}
                                    {drillDept === 'sales' && <TableHead className="text-right">TL Comm</TableHead>}
                                    {drillDept === 'sales' && <TableHead className="text-right">SM Pool</TableHead>}
                                    {drillDept === 'cs' && <TableHead className="text-right">CS Head</TableHead>}
                                    {drillDept === 'cs' && <TableHead className="text-right">Mentor</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drillData.rows?.map((r) => (
                                    <TableRow key={r.sr}>
                                        <TableCell className="text-muted-foreground">{r.sr}</TableCell>
                                        <TableCell className="font-medium">{r.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-xs">{r.role}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{drillDept === 'sales' ? fmtCur(r.achieved) : r.upgrades}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{fmtCur(r.earned_commission)}</TableCell>
                                        <TableCell className="text-right font-mono text-amber-500">{fmtCur(r.pending_commission)}</TableCell>
                                        {drillDept === 'sales' && <TableCell>{r.benchmark_crossed ? <Badge className="bg-emerald-500 text-white text-xs">Yes</Badge> : <Badge variant="outline" className="text-xs text-red-500">No</Badge>}</TableCell>}
                                        {drillDept === 'sales' && <TableCell className="text-right font-mono text-purple-500">{fmtCur(r.tl_commission)}</TableCell>}
                                        {drillDept === 'sales' && <TableCell className="text-right font-mono text-blue-500">{fmtCur(r.sm_pool)}</TableCell>}
                                        {drillDept === 'cs' && <TableCell className="text-right font-mono text-purple-500">{fmtCur(r.cs_head_commission)}</TableCell>}
                                        {drillDept === 'cs' && <TableCell className="text-right font-mono text-red-500">{fmtCur(r.mentor_commission)}</TableCell>}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Commission Dialog */}
            <Dialog open={!!editingTxn} onOpenChange={() => setEditingTxn(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Edit Commission</DialogTitle></DialogHeader>
                    {editingTxn && (
                        <div className="space-y-4">
                            <div className="text-sm space-y-1">
                                <p><strong>Agent:</strong> {editingTxn.agent_name}</p>
                                <p><strong>Student:</strong> {editingTxn.student_name}</p>
                                <p><strong>Amount:</strong> {fmtCur(editingTxn.amount)}</p>
                                <p><strong>Original Commission:</strong> {fmtCur(editingTxn.original_commission)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">New Commission Amount (AED)</label>
                                <Input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)} data-testid="edit-commission-input" className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">CEO Notes</label>
                                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Reason for adjustment..." data-testid="edit-notes-input" className="mt-1" />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setEditingTxn(null)}>Cancel</Button>
                                <Button size="sm" onClick={saveEditTxn} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="save-edit-txn">
                                    <Check className="h-3.5 w-3.5 mr-1" /> Save & Approve
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

const SALES_BENCHMARK_AED = 18000;
