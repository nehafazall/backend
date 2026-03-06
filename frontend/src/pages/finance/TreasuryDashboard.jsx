import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowDownCircle, ArrowUpCircle, Landmark, Building2, Settings, Clock, CheckCircle, AlertTriangle, Filter, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleDateString('en-CA');
    } catch {
        return "-";
    }
};

const TreasuryDashboard = () => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cltPayables, setCltPayables] = useState([]);
    const [cltReceivables, setCltReceivables] = useState([]);
    const [pendingSettlements, setPendingSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBank, setSelectedBank] = useState('all');
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [bankRes, cltPayRes, cltRecRes, settlementsRes] = await Promise.all([
                api.get('/finance/settings/bank-accounts').catch(() => ({ data: [] })),
                api.get('/finance/clt/payables').catch(() => ({ data: [] })),
                api.get('/finance/clt/receivables').catch(() => ({ data: [] })),
                api.get('/finance/pending-settlements').catch(() => ({ data: { settlements: [] } }))
            ]);

            setBankAccounts(bankRes.data || []);
            setCltPayables(cltPayRes.data || []);
            setCltReceivables(cltRecRes.data || []);
            setPendingSettlements(settlementsRes.data?.settlements || []);
        } catch (error) {
            toast.error('Failed to fetch treasury data');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        // Calculate total opening balance from bank accounts
        const activeAccounts = bankAccounts.filter(a => a.is_active !== false);
        const totalOpeningBalance = activeAccounts.reduce((sum, a) => sum + (a.opening_balance || 0), 0);
        const totalCurrentBalance = activeAccounts.reduce((sum, a) => sum + (a.current_balance || a.opening_balance || 0), 0);
        
        // Filter by selected bank if not 'all'
        const filteredReceivables = selectedBank === 'all' 
            ? cltReceivables 
            : cltReceivables.filter(r => r.bank_account_id === selectedBank || r.destination_bank?.includes(bankAccounts.find(b => b.id === selectedBank)?.bank_name));
        const filteredPayables = selectedBank === 'all'
            ? cltPayables
            : cltPayables.filter(p => p.bank_account_id === selectedBank);
        
        // Calculate inflows and outflows from CLT transactions
        const totalCltInflows = filteredReceivables.reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
        const totalCltOutflows = filteredPayables.reduce((sum, p) => sum + (p.amount_in_aed || p.amount || 0), 0);
        
        // Calculate settled vs pending receivables
        const settledReceivables = filteredReceivables.filter(r => r.settlement_status === 'settled');
        const pendingReceivables = filteredReceivables.filter(r => r.settlement_status !== 'settled');
        const settledAmount = settledReceivables.reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
        const pendingAmount = pendingReceivables.reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
        
        // Calculate pending settlements from dedicated endpoint
        const pendingSettlementAmount = pendingSettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
        
        // Calculate amounts by bank account
        const amountsByBank = activeAccounts.map(bank => {
            const bankReceivables = cltReceivables.filter(r => 
                r.bank_account_id === bank.id || 
                r.destination_bank?.toLowerCase().includes(bank.bank_name?.toLowerCase())
            );
            const bankPayables = cltPayables.filter(p => p.bank_account_id === bank.id);
            
            const inflows = bankReceivables.reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
            const outflows = bankPayables.reduce((sum, p) => sum + (p.amount_in_aed || p.amount || 0), 0);
            const pendingInflows = bankReceivables.filter(r => r.settlement_status !== 'settled')
                .reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
            
            return {
                ...bank,
                inflows,
                outflows,
                pendingInflows,
                settledInflows: inflows - pendingInflows,
                projectedBalance: (bank.current_balance || bank.opening_balance || 0) + inflows - outflows,
                currentActualBalance: (bank.current_balance || bank.opening_balance || 0) + (inflows - pendingInflows) - outflows
            };
        });
        
        const netCashFlow = totalCltInflows - totalCltOutflows;
        const preSettlementBalance = totalCurrentBalance + settledAmount - totalCltOutflows;
        const postSettlementBalance = totalCurrentBalance + totalCltInflows - totalCltOutflows;

        return {
            totalOpeningBalance,
            totalCurrentBalance,
            totalCltInflows,
            totalCltOutflows,
            settledAmount,
            pendingAmount,
            pendingSettlementAmount: pendingSettlementAmount || pendingAmount,
            netCashFlow,
            preSettlementBalance,
            postSettlementBalance,
            bankAccounts: activeAccounts,
            amountsByBank,
            accountCount: activeAccounts.length,
            receivablesCount: filteredReceivables.length,
            payablesCount: filteredPayables.length
        };
    }, [bankAccounts, cltPayables, cltReceivables, pendingSettlements, selectedBank]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="treasury-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-500">Treasury Dashboard</h1>
                    <p className="text-muted-foreground">Bank accounts & cash flow overview</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                        <SelectTrigger className="w-[200px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by Bank" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Bank Accounts</SelectItem>
                            {bankAccounts.filter(b => b.is_active !== false).map(bank => (
                                <SelectItem key={bank.id} value={bank.id}>
                                    {bank.bank_name} - {bank.account_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => navigate('/finance/settings/bank-accounts')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Banks
                    </Button>
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Cash Flow Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pre-Settlement Balance</CardTitle>
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">AED {formatNumber(summary.preSettlementBalance)}</div>
                        <p className="text-xs text-muted-foreground">
                            Settled: AED {formatNumber(summary.settledAmount)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Post-Settlement Balance</CardTitle>
                        <Clock className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">AED {formatNumber(summary.postSettlementBalance)}</div>
                        <p className="text-xs text-muted-foreground">
                            Pending: AED {formatNumber(summary.pendingAmount)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(summary.totalCltInflows)}</div>
                        <p className="text-xs text-muted-foreground">{summary.receivablesCount} receivables</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">AED {formatNumber(summary.totalCltOutflows)}</div>
                        <p className="text-xs text-muted-foreground">{summary.payablesCount} payables</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bank Account Cash Flow Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5" />
                        Cash Flow by Bank Account
                    </CardTitle>
                    <CardDescription>Pre vs Post settlement breakdown per bank</CardDescription>
                </CardHeader>
                <CardContent>
                    {summary.amountsByBank.length === 0 ? (
                        <div className="text-center py-8">
                            <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">No bank accounts configured</p>
                            <Button onClick={() => navigate('/finance/settings/bank-accounts')}>
                                Add Bank Account
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bank Account</TableHead>
                                    <TableHead className="text-right">Opening Balance</TableHead>
                                    <TableHead className="text-right text-green-500">Settled Inflows</TableHead>
                                    <TableHead className="text-right text-amber-500">Pending Inflows</TableHead>
                                    <TableHead className="text-right text-red-500">Outflows</TableHead>
                                    <TableHead className="text-right">Current Balance</TableHead>
                                    <TableHead className="text-right text-blue-500">Projected Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.amountsByBank.map(bank => (
                                    <TableRow key={bank.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBank(bank.id)}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{bank.bank_name}</p>
                                                    <p className="text-xs text-muted-foreground">{bank.account_name}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">AED {formatNumber(bank.opening_balance)}</TableCell>
                                        <TableCell className="text-right text-green-500">+{formatNumber(bank.settledInflows)}</TableCell>
                                        <TableCell className="text-right text-amber-500">
                                            {bank.pendingInflows > 0 && (
                                                <Badge variant="outline" className="text-amber-500 border-amber-500">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    +{formatNumber(bank.pendingInflows)}
                                                </Badge>
                                            )}
                                            {bank.pendingInflows === 0 && '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-red-500">-{formatNumber(bank.outflows)}</TableCell>
                                        <TableCell className="text-right font-medium">AED {formatNumber(bank.currentActualBalance)}</TableCell>
                                        <TableCell className="text-right text-blue-500 font-medium">AED {formatNumber(bank.projectedBalance)}</TableCell>
                                    </TableRow>
                                ))}
                                {/* Totals Row */}
                                <TableRow className="bg-muted/30 font-bold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">AED {formatNumber(summary.totalOpeningBalance)}</TableCell>
                                    <TableCell className="text-right text-green-500">+{formatNumber(summary.settledAmount)}</TableCell>
                                    <TableCell className="text-right text-amber-500">+{formatNumber(summary.pendingAmount)}</TableCell>
                                    <TableCell className="text-right text-red-500">-{formatNumber(summary.totalCltOutflows)}</TableCell>
                                    <TableCell className="text-right">AED {formatNumber(summary.preSettlementBalance)}</TableCell>
                                    <TableCell className="text-right text-blue-500">AED {formatNumber(summary.postSettlementBalance)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/finance/clt/receivables')}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ArrowDownCircle className="h-8 w-8 text-green-500" />
                                <div>
                                    <h4 className="font-medium">View All Receivables</h4>
                                    <p className="text-sm text-muted-foreground">{summary.receivablesCount} transactions</p>
                                </div>
                            </div>
                            <div className="text-xl font-bold text-green-500">
                                +AED {formatNumber(summary.totalCltInflows)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/finance/clt/payables')}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ArrowUpCircle className="h-8 w-8 text-red-500" />
                                <div>
                                    <h4 className="font-medium">View All Payables</h4>
                                    <p className="text-sm text-muted-foreground">{summary.payablesCount} transactions</p>
                                </div>
                            </div>
                            <div className="text-xl font-bold text-red-500">
                                -AED {formatNumber(summary.totalCltOutflows)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TreasuryDashboard;
