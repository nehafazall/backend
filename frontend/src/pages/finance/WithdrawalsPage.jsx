import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, Search, ArrowDownRight, ArrowUpRight, Wallet, Calendar } from 'lucide-react';

const USD_TO_AED = 3.674;
const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);
const fmtUSD = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

function WithdrawalsPage() {
    const [deposits, setDeposits] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [wdModal, setWdModal] = useState({ open: false, student: null });
    const [wdForm, setWdForm] = useState({ amount_usd: '', date: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [depRes, wdRes] = await Promise.all([
                apiClient.get(`/finance/mentor-student-deposits?limit=200&search=${search}`),
                apiClient.get('/finance/mentor-withdrawals?limit=100'),
            ]);
            setDeposits(depRes.data.items || []);
            setWithdrawals(wdRes.data.items || []);
        } catch (err) { toast.error('Failed to load data'); }
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openWithdrawal = (student) => {
        setWdModal({ open: true, student });
        setWdForm({ amount_usd: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    };

    const submitWithdrawal = async () => {
        if (!wdForm.amount_usd || parseFloat(wdForm.amount_usd) <= 0) {
            toast.error('Enter a valid amount'); return;
        }
        setSubmitting(true);
        try {
            await apiClient.post('/finance/mentor-withdrawal', {
                student_id: wdModal.student.student_id,
                amount_usd: parseFloat(wdForm.amount_usd),
                date: wdForm.date,
                notes: wdForm.notes,
            });
            toast.success(`Withdrawal of ${fmtUSD(wdForm.amount_usd)} recorded for ${wdModal.student.student_name}`);
            setWdModal({ open: false, student: null });
            fetchData();
        } catch (err) { toast.error('Failed to record withdrawal'); }
        setSubmitting(false);
    };

    const totalDep = deposits.reduce((s, d) => s + d.total_deposits_usd, 0);
    const totalWd = deposits.reduce((s, d) => s + d.total_withdrawals_usd, 0);
    const totalNet = totalDep - totalWd;

    return (
        <div className="space-y-6" data-testid="withdrawals-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="h-8 w-8 text-purple-500" />
                    Mentor Withdrawals
                </h1>
                <p className="text-muted-foreground">Record student withdrawals against mentor deposits</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div><p className="text-xs uppercase text-muted-foreground">Total Deposits</p><p className="text-xl font-bold text-emerald-500 font-mono">{fmtAED(totalDep * USD_TO_AED)}</p></div>
                        <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div><p className="text-xs uppercase text-muted-foreground">Total Withdrawals</p><p className="text-xl font-bold text-red-500 font-mono">{fmtAED(totalWd * USD_TO_AED)}</p></div>
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div><p className="text-xs uppercase text-muted-foreground">Net</p><p className={`text-xl font-bold font-mono ${totalNet >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{fmtAED(totalNet * USD_TO_AED)}</p></div>
                        <DollarSign className="h-5 w-5 text-blue-500" />
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="deposits" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="deposits">Student Deposits</TabsTrigger>
                    <TabsTrigger value="history">Withdrawal History</TabsTrigger>
                </TabsList>

                <TabsContent value="deposits">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Students with Deposits</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9" data-testid="search-input" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Mentor</TableHead>
                                            <TableHead className="text-right">Deposits</TableHead>
                                            <TableHead className="text-right">Withdrawals</TableHead>
                                            <TableHead className="text-right">Net</TableHead>
                                            <TableHead className="text-center">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deposits.map((d) => (
                                            <TableRow key={d.student_id} data-testid={`deposit-row-${d.student_id}`}>
                                                <TableCell>
                                                    <p className="font-medium text-sm">{d.student_name}</p>
                                                    <p className="text-xs text-muted-foreground">{d.student_email}</p>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{d.mentor_name}</TableCell>
                                                <TableCell className="text-right">
                                                    <p className="font-mono text-sm text-emerald-500">{fmtUSD(d.total_deposits_usd)}</p>
                                                    <p className="text-[10px] text-muted-foreground">{d.deposit_count} deposits</p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <p className="font-mono text-sm text-red-500">{fmtUSD(d.total_withdrawals_usd)}</p>
                                                    {d.withdrawal_count > 0 && <p className="text-[10px] text-muted-foreground">{d.withdrawal_count} withdrawals</p>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <p className={`font-mono text-sm font-semibold ${d.net_usd >= 0 ? 'text-blue-500' : 'text-red-500'}`}>{fmtUSD(d.net_usd)}</p>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button size="sm" variant="outline" onClick={() => openWithdrawal(d)} data-testid={`record-withdrawal-${d.student_id}`}>
                                                        <ArrowDownRight className="h-3.5 w-3.5 mr-1" /> Withdraw
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {deposits.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No deposit records found</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Recent Withdrawals</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Mentor</TableHead>
                                        <TableHead className="text-right">Amount (USD)</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.map((w) => (
                                        <TableRow key={w.id}>
                                            <TableCell className="text-sm">{w.date}</TableCell>
                                            <TableCell className="text-sm font-medium">{w.student_name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{w.mentor_name}</TableCell>
                                            <TableCell className="text-right font-mono text-red-500">{fmtUSD(w.amount)}</TableCell>
                                            <TableCell className="text-right font-mono text-red-500">{fmtAED(w.amount_aed)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{w.notes}</TableCell>
                                        </TableRow>
                                    ))}
                                    {withdrawals.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No withdrawals recorded yet</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Withdrawal Modal */}
            <Dialog open={wdModal.open} onOpenChange={(o) => setWdModal({ open: o, student: wdModal.student })}>
                <DialogContent data-testid="withdrawal-modal">
                    <DialogHeader>
                        <DialogTitle>Record Withdrawal</DialogTitle>
                    </DialogHeader>
                    {wdModal.student && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                <p className="font-medium">{wdModal.student.student_name}</p>
                                <p className="text-xs text-muted-foreground">Mentor: {wdModal.student.mentor_name}</p>
                                <div className="flex gap-4 mt-2">
                                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Deposits: {fmtUSD(wdModal.student.total_deposits_usd)}</Badge>
                                    <Badge variant="outline" className="text-red-500 border-red-500/30">Withdrawn: {fmtUSD(wdModal.student.total_withdrawals_usd)}</Badge>
                                    <Badge variant="outline">Net: {fmtUSD(wdModal.student.net_usd)}</Badge>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Withdrawal Amount (USD)</label>
                                <Input type="number" placeholder="e.g. 500" value={wdForm.amount_usd}
                                    onChange={(e) => setWdForm(p => ({...p, amount_usd: e.target.value}))}
                                    data-testid="withdrawal-amount-input" />
                                {wdForm.amount_usd && <p className="text-xs text-muted-foreground mt-1">= {fmtAED(parseFloat(wdForm.amount_usd || 0) * USD_TO_AED)}</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Date</label>
                                <Input type="date" value={wdForm.date} onChange={(e) => setWdForm(p => ({...p, date: e.target.value}))} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Notes (optional)</label>
                                <Input placeholder="Reason for withdrawal" value={wdForm.notes}
                                    onChange={(e) => setWdForm(p => ({...p, notes: e.target.value}))} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setWdModal({ open: false, student: null })}>Cancel</Button>
                        <Button onClick={submitWithdrawal} disabled={submitting} data-testid="submit-withdrawal-btn">
                            {submitting ? 'Recording...' : 'Record Withdrawal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default WithdrawalsPage;
