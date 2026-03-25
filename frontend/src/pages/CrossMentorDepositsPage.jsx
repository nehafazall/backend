import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/api';
import apiClient from '@/lib/api';
import { PeriodFilter } from '@/components/PeriodFilter';
import { Plus, Search, DollarSign, TrendingUp, Award, Users, ArrowRight } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0);
const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const BONUS_TIERS = [
    { min_usd: 10000, pct: 10 },
    { min_usd: 20000, pct: 15 },
    { min_usd: 30000, pct: 17.5 },
    { min_usd: 40000, pct: 20 },
    { min_usd: 50000, pct: 25 },
];

export default function CrossMentorDepositsPage() {
    const { user } = useAuth();
    const [deposits, setDeposits] = useState([]);
    const [effortSummary, setEffortSummary] = useState([]);
    const [myEffort, setMyEffort] = useState(null);
    const [periodFilter, setPeriodFilter] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [formData, setFormData] = useState({ amount: '', notes: '', date: new Date().toISOString().slice(0, 10) });
    const [loading, setLoading] = useState(false);

    const isAdmin = ['super_admin', 'admin'].includes(user?.role);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = periodFilter ? `period=custom&custom_start=${periodFilter.date_from}&custom_end=${periodFilter.date_to}` : 'period=this_month';
            const [depsRes, effortRes] = await Promise.all([
                apiClient.get(`/mentor/cross-deposits?${params}`),
                apiClient.get(`/mentor/effort-summary?${params}`),
            ]);
            setDeposits(depsRes.data?.deposits || []);
            setEffortSummary(depsRes.data?.effort_summary || []);
            setMyEffort(effortRes.data || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [periodFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSearch = async (q) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await apiClient.get(`/mentor/cross-deposits/search-student?q=${encodeURIComponent(q)}`);
            setSearchResults(res.data || []);
        } catch { setSearchResults([]); }
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setSearchQuery(student.full_name);
    };

    const handleSubmit = async () => {
        if (!selectedStudent || !formData.amount) { toast.error('Select a student and enter amount'); return; }
        try {
            await apiClient.post('/mentor/cross-deposits', {
                student_id: selectedStudent.id,
                amount: parseFloat(formData.amount),
                notes: formData.notes,
                date: formData.date,
            });
            toast.success('Cross-mentor deposit recorded');
            setDialogOpen(false);
            setSelectedStudent(null);
            setSearchQuery('');
            setFormData({ amount: '', notes: '', date: new Date().toISOString().slice(0, 10) });
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to record deposit');
        }
    };

    const effort = myEffort || {};
    const currentTierIdx = BONUS_TIERS.findIndex(t => t.min_usd > (effort.total_effort_usd || 0));
    const progressTier = currentTierIdx > 0 ? BONUS_TIERS[currentTierIdx - 1] : null;
    const nextTier = currentTierIdx >= 0 && currentTierIdx < BONUS_TIERS.length ? BONUS_TIERS[currentTierIdx] : null;
    const progressPct = nextTier ? Math.min(100, ((effort.total_effort_usd || 0) / nextTier.min_usd) * 100) : 100;

    return (
        <div className="space-y-6" data-testid="cross-mentor-deposits-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Cross-Mentor Deposits</h1>
                    <p className="text-muted-foreground text-sm">Track deposits brought by mentors for other mentors' students</p>
                </div>
                <div className="flex items-center gap-3">
                    <PeriodFilter onChange={setPeriodFilter} defaultPeriod="this_month" />
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button data-testid="record-cross-deposit-btn"><Plus className="h-4 w-4 mr-2" />Record Deposit</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Record Cross-Mentor Deposit</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                                        <Search className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            className="flex-1 bg-transparent outline-none text-sm"
                                            placeholder="Search student by name, email or phone..."
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            data-testid="student-search-input"
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {searchResults.map(s => (
                                                <div key={s.id} className="px-3 py-2 hover:bg-accent cursor-pointer text-sm" onClick={() => handleSelectStudent(s)} data-testid={`student-result-${s.id}`}>
                                                    <p className="font-medium">{s.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{s.email} | {s.phone}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedStudent && (
                                    <Card className="bg-muted/30">
                                        <CardContent className="pt-3 pb-3 grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{selectedStudent.full_name}</span></div>
                                            <div><span className="text-muted-foreground">Email:</span> {selectedStudent.email || '-'}</div>
                                            <div><span className="text-muted-foreground">Phone:</span> {selectedStudent.phone || '-'}</div>
                                            <div><span className="text-muted-foreground">MT5 ID:</span> {selectedStudent.mt5_id || '-'}</div>
                                            <div><span className="text-muted-foreground">Assigned Mentor:</span> <span className="text-amber-500 font-medium">{selectedStudent.mentor_name || '-'}</span></div>
                                            <div><span className="text-muted-foreground">BD Agent:</span> {selectedStudent.bd_agent_name || '-'}</div>
                                            <div><span className="text-muted-foreground">CS Agent:</span> {selectedStudent.cs_agent_name || '-'}</div>
                                        </CardContent>
                                    </Card>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium">Amount (USD)</label>
                                        <Input type="number" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} placeholder="e.g. 500" data-testid="deposit-amount-input" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Date</label>
                                        <Input type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} data-testid="deposit-date-input" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Notes</label>
                                    <Textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} placeholder="Optional notes..." rows={2} />
                                </div>
                                <Button onClick={handleSubmit} className="w-full" data-testid="submit-cross-deposit-btn">Record Deposit</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* My Effort & Bonus Progress */}
            {!isAdmin && myEffort && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card data-testid="own-deposits-card">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground uppercase">Own Student Deposits</p>
                            <p className="text-2xl font-bold font-mono text-emerald-500">{fmt(effort.own_deposits_usd)}</p>
                            <p className="text-xs text-muted-foreground">{effort.own_count} deposits</p>
                        </CardContent>
                    </Card>
                    <Card data-testid="cross-deposits-card">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground uppercase">Cross-Mentor Deposits</p>
                            <p className="text-2xl font-bold font-mono text-blue-500">{fmt(effort.cross_deposits_usd)}</p>
                            <p className="text-xs text-muted-foreground">{effort.cross_count} deposits for other mentors</p>
                        </CardContent>
                    </Card>
                    <Card data-testid="total-effort-card">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground uppercase">Total Effort</p>
                            <p className="text-2xl font-bold font-mono text-primary">{fmt(effort.total_effort_usd)}</p>
                            <p className="text-xs text-muted-foreground">{effort.total_count} total deposits</p>
                        </CardContent>
                    </Card>
                    <Card data-testid="bonus-progress-card">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground uppercase">Bonus Status</p>
                            {effort.bonus_tier ? (
                                <>
                                    <p className="text-2xl font-bold font-mono text-amber-500">{effort.bonus_tier.pct}%</p>
                                    <p className="text-xs text-muted-foreground">of salary = {fmtAED(effort.bonus_amount)}</p>
                                </>
                            ) : (
                                <p className="text-lg font-bold text-muted-foreground">No tier yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bonus Tier Progress Bar */}
            {!isAdmin && myEffort && (
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="h-5 w-5 text-amber-500" />
                            <span className="font-medium text-sm">Bonus Progress — Total Effort: {fmt(effort.total_effort_usd)}</span>
                            {nextTier && <span className="text-xs text-muted-foreground ml-auto">{fmt(nextTier.min_usd - (effort.total_effort_usd || 0))} to next tier ({nextTier.pct}%)</span>}
                        </div>
                        <div className="relative">
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="flex justify-between mt-1">
                                {BONUS_TIERS.map(t => (
                                    <div key={t.min_usd} className={`text-xs ${(effort.total_effort_usd || 0) >= t.min_usd ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                                        ${t.min_usd / 1000}K ({t.pct}%)
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Effort Leaderboard (Admin/Head view) */}
            {(isAdmin || ['master_of_academics', 'master_of_academics_'].includes(user?.role)) && effortSummary.length > 0 && (
                <Card data-testid="effort-leaderboard">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" />Effort Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mentor</TableHead>
                                    <TableHead className="text-right">Deposits</TableHead>
                                    <TableHead className="text-right">Total Effort (USD)</TableHead>
                                    <TableHead className="text-right">Total Effort (AED)</TableHead>
                                    <TableHead className="text-right">Bonus Tier</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {effortSummary.map(e => (
                                    <TableRow key={e.mentor_id}>
                                        <TableCell className="font-medium">{e.mentor_name}</TableCell>
                                        <TableCell className="text-right">{e.deposit_count}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{fmt(e.total_effort_usd)}</TableCell>
                                        <TableCell className="text-right font-mono">{fmtAED(e.total_effort_aed)}</TableCell>
                                        <TableCell className="text-right">
                                            {e.bonus_tier ? (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">{e.bonus_tier.pct}%</Badge>
                                            ) : <span className="text-muted-foreground text-xs">—</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Deposits Table */}
            <Card data-testid="deposits-table">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Deposit Records</CardTitle>
                    <CardDescription>{deposits.length} cross-mentor deposits</CardDescription>
                </CardHeader>
                <CardContent>
                    {deposits.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Assigned Mentor</TableHead>
                                    <TableHead>Brought By</TableHead>
                                    <TableHead className="text-right">Amount (USD)</TableHead>
                                    <TableHead className="text-right">Amount (AED)</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deposits.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell className="text-sm">{d.date}</TableCell>
                                        <TableCell className="font-medium text-sm">{d.student_name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{d.mentor_name || '-'}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-xs">{d.effort_by_name}</Badge></TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">{fmt(d.amount)}</TableCell>
                                        <TableCell className="text-right font-mono">{fmtAED(d.amount_aed)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{d.notes || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No cross-mentor deposits recorded for this period</p>
                            <Button variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}>Record First Deposit</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
