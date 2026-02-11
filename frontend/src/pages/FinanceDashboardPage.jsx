import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle,
    Plus, RefreshCw, Lock, FileText, Building2, CreditCard, Wallet,
    ArrowRightLeft, Receipt, PieChart, BarChart3, Calendar, ChevronRight, Send, Check, Banknote
} from 'lucide-react';
import { BalanceCard, KPICard, AlertCard } from '@/components/finance/FinanceCards';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const FinanceDashboardPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [journalEntries, setJournalEntries] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [transfers, setTransfers] = useState([]);
    
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    
    const [journalForm, setJournalForm] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [
            { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
            { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' }
        ]
    });
    
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        expense_account_id: '',
        amount: '',
        paid_from_account_id: '',
        notes: ''
    });
    
    const [transferForm, setTransferForm] = useState({
        date: new Date().toISOString().split('T')[0],
        source_account_id: '',
        destination_account_id: '',
        amount: '',
        notes: ''
    });

    useEffect(() => {
        fetchDashboardData();
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (activeTab === 'journal') fetchJournalEntries();
        if (activeTab === 'settlements') fetchSettlements();
        if (activeTab === 'expenses') fetchExpenses();
        if (activeTab === 'transfers') fetchTransfers();
    }, [activeTab]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/dashboard');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/accounting/accounts');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchJournalEntries = async () => {
        try {
            const response = await api.get('/accounting/journal-entries?limit=50');
            setJournalEntries(response.data.entries || []);
        } catch (error) {
            console.error('Error fetching journal entries:', error);
        }
    };

    const fetchSettlements = async () => {
        try {
            const response = await api.get('/accounting/settlements');
            setSettlements(response.data || []);
        } catch (error) {
            console.error('Error fetching settlements:', error);
        }
    };

    const fetchExpenses = async () => {
        try {
            const response = await api.get('/accounting/expenses');
            setExpenses(response.data || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    const fetchTransfers = async () => {
        try {
            const response = await api.get('/accounting/transfers');
            setTransfers(response.data || []);
        } catch (error) {
            console.error('Error fetching transfers:', error);
        }
    };

    const seedAccounts = async () => {
        try {
            await api.post('/accounting/accounts/seed');
            toast.success('Accounts seeded successfully');
            fetchAccounts();
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to seed accounts');
        }
    };

    const assetAccounts = accounts.filter(a => a.account_type === 'Asset');
    const expenseAccounts = accounts.filter(a => a.account_type === 'Expense');
    const bankAccounts = accounts.filter(a => ['Bank', 'Wallet', 'Cash'].includes(a.subtype));

    const handleCreateJournal = async (e) => {
        e.preventDefault();
        const totalDebit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
        const totalCredit = journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            toast.error(`Entry not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
            return;
        }

        try {
            await api.post('/accounting/journal-entries', {
                ...journalForm,
                lines: journalForm.lines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
            });
            toast.success('Journal entry created');
            setShowJournalModal(false);
            fetchJournalEntries();
            fetchDashboardData();
            resetJournalForm();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create journal entry');
        }
    };

    const resetJournalForm = () => {
        setJournalForm({
            entry_date: new Date().toISOString().split('T')[0],
            description: '',
            lines: [
                { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' },
                { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' }
            ]
        });
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounting/expenses', {
                ...expenseForm,
                amount: parseFloat(expenseForm.amount)
            });
            toast.success('Expense recorded');
            setShowExpenseModal(false);
            fetchExpenses();
            fetchDashboardData();
            setExpenseForm({ date: new Date().toISOString().split('T')[0], vendor: '', expense_account_id: '', amount: '', paid_from_account_id: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to record expense');
        }
    };

    const handleCreateTransfer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounting/transfers', {
                ...transferForm,
                amount: parseFloat(transferForm.amount)
            });
            toast.success('Transfer recorded');
            setShowTransferModal(false);
            fetchTransfers();
            fetchDashboardData();
            setTransferForm({ date: new Date().toISOString().split('T')[0], source_account_id: '', destination_account_id: '', amount: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to record transfer');
        }
    };

    const handleJournalAction = async (entryId, action) => {
        try {
            if (action === 'submit') {
                await api.post(`/accounting/journal-entries/${entryId}/submit`);
                toast.success('Entry submitted for approval');
            } else if (action === 'approve') {
                await api.post(`/accounting/journal-entries/${entryId}/approve`);
                toast.success('Entry approved and locked');
            }
            fetchJournalEntries();
        } catch (error) {
            toast.error(error.response?.data?.detail || `Failed to ${action} entry`);
        }
    };

    const addJournalLine = () => {
        setJournalForm(prev => ({
            ...prev,
            lines: [...prev.lines, { account_id: '', debit_amount: 0, credit_amount: 0, memo: '' }]
        }));
    };

    const updateJournalLine = (index, field, value) => {
        setJournalForm(prev => ({
            ...prev,
            lines: prev.lines.map((line, i) => 
                i === index ? { ...line, [field]: field.includes('amount') ? parseFloat(value) || 0 : value } : line
            )
        }));
    };

    const journalTotals = {
        debit: journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0),
        credit: journalForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0)
    };
    const journalIsBalanced = Math.abs(journalTotals.debit - journalTotals.credit) < 0.01;

    if (loading && !dashboardData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="finance-dashboard">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
                    <p className="text-muted-foreground">Double-Entry Accounting & CFO Dashboard</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchDashboardData} data-testid="refresh-btn">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    {accounts.length === 0 && (
                        <Button onClick={seedAccounts} data-testid="seed-btn">
                            <Plus className="h-4 w-4 mr-2" />
                            Seed Accounts
                        </Button>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="dashboard" data-testid="tab-dashboard"><PieChart className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
                    <TabsTrigger value="journal" data-testid="tab-journal"><FileText className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Journal</span></TabsTrigger>
                    <TabsTrigger value="settlements" data-testid="tab-settlements"><CreditCard className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Settlements</span></TabsTrigger>
                    <TabsTrigger value="expenses" data-testid="tab-expenses"><Receipt className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Expenses</span></TabsTrigger>
                    <TabsTrigger value="transfers" data-testid="tab-transfers"><ArrowRightLeft className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Transfers</span></TabsTrigger>
                    <TabsTrigger value="accounts" data-testid="tab-accounts"><Building2 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Accounts</span></TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6 mt-6">
                    {dashboardData && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <KPICard title="Total Cash Position" value={formatCurrency(dashboardData.account_balances?.total_cash_position || 0)} icon={Wallet} color="green" />
                                <KPICard title="Pending Receivables" value={formatCurrency(dashboardData.account_balances?.total_pending_receivables || 0)} icon={CreditCard} color="amber" />
                                <KPICard title="Today's Revenue" value={formatCurrency(dashboardData.kpis?.today?.revenue || 0)} icon={TrendingUp} color="blue" />
                                <KPICard title="MTD Revenue" value={formatCurrency(dashboardData.kpis?.mtd?.gross_revenue || 0)} icon={BarChart3} color="purple" />
                                <KPICard title="MTD Provider Fees" value={formatCurrency(dashboardData.kpis?.mtd?.provider_fees || 0)} icon={TrendingDown} color="red" />
                                <KPICard title="7-Day Forecast" value={formatCurrency(dashboardData.settlements?.next_7_days_forecast || 0)} subtitle={`${dashboardData.settlements?.upcoming_count || 0} settlements`} icon={Calendar} color="blue" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Where Money Lies</CardTitle>
                                        <CardDescription>Live account balances</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {dashboardData.account_balances?.banks_and_wallets?.map((account) => (
                                                <BalanceCard key={account.id} account={account} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Alerts</CardTitle>
                                        <CardDescription>{dashboardData.alerts?.length || 0} active alerts</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[300px]">
                                            <div className="space-y-3">
                                                {dashboardData.alerts?.length > 0 ? (
                                                    dashboardData.alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)
                                                ) : (
                                                    <div className="text-center text-muted-foreground py-8">
                                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                                        No active alerts
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Provider Receivables</CardTitle>
                                    <CardDescription>Pending settlements from payment providers</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {dashboardData.account_balances?.receivables?.map((account) => (
                                            <BalanceCard key={account.id} account={account} />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="journal" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Journal Entries</h2>
                        <Button onClick={() => setShowJournalModal(true)} data-testid="new-journal-btn"><Plus className="h-4 w-4 mr-2" />New Entry</Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {journalEntries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>{formatDate(entry.entry_date)}</TableCell>
                                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                                        <TableCell><Badge variant="outline">{entry.source_module}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(entry.total_debit)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(entry.total_credit)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Badge variant={entry.status === 'Approved' ? 'default' : entry.status === 'Submitted' ? 'secondary' : 'outline'}>{entry.status}</Badge>
                                                {entry.lock_status === 'LOCKED' && <Lock className="h-3 w-3 text-muted-foreground" />}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {entry.status === 'Draft' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleJournalAction(entry.id, 'submit')}><Send className="h-3 w-3 mr-1" />Submit</Button>
                                                )}
                                                {entry.status === 'Submitted' && (
                                                    <Button size="sm" variant="default" onClick={() => handleJournalAction(entry.id, 'approve')}><Check className="h-3 w-3 mr-1" />Approve</Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {journalEntries.length === 0 && (
                                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No journal entries yet</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="settlements" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Settlement Batches</h2>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                    <TableHead className="text-right">Fees</TableHead>
                                    <TableHead>Expected</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settlements.map((batch) => (
                                    <TableRow key={batch.id} className={batch.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                        <TableCell className="font-medium">{batch.provider}</TableCell>
                                        <TableCell>{formatDate(batch.period_start)} - {formatDate(batch.period_end)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(batch.gross_amount)}</TableCell>
                                        <TableCell className="text-right font-mono">{batch.net_received ? formatCurrency(batch.net_received) : '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-red-600">{batch.fees_withheld ? formatCurrency(batch.fees_withheld) : '-'}</TableCell>
                                        <TableCell>{formatDate(batch.expected_settlement_date)}</TableCell>
                                        <TableCell><Badge variant={batch.status === 'Settled' ? 'default' : batch.is_overdue ? 'destructive' : 'secondary'}>{batch.is_overdue ? 'Overdue' : batch.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {settlements.length === 0 && (
                                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No settlement batches yet</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Expenses</h2>
                        <Button onClick={() => setShowExpenseModal(true)} data-testid="new-expense-btn"><Plus className="h-4 w-4 mr-2" />Record Expense</Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Paid From</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{formatDate(expense.date)}</TableCell>
                                        <TableCell className="font-medium">{expense.vendor}</TableCell>
                                        <TableCell>{expense.expense_account_name}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                                        <TableCell>{expense.paid_from_account_name}</TableCell>
                                        <TableCell><Badge variant={expense.status === 'Approved' ? 'default' : 'secondary'}>{expense.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {expenses.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No expenses recorded yet</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="transfers" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Account Transfers</h2>
                        <Button onClick={() => setShowTransferModal(true)} data-testid="new-transfer-btn"><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead></TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transfers.map((transfer) => (
                                    <TableRow key={transfer.id}>
                                        <TableCell>{formatDate(transfer.date)}</TableCell>
                                        <TableCell className="font-medium">{transfer.source_account_name}</TableCell>
                                        <TableCell><ChevronRight className="h-4 w-4" /></TableCell>
                                        <TableCell className="font-medium">{transfer.destination_account_name}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(transfer.amount, transfer.currency)}</TableCell>
                                        <TableCell><Badge variant={transfer.status === 'Approved' ? 'default' : 'secondary'}>{transfer.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                                {transfers.length === 0 && (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transfers recorded yet</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="accounts" className="space-y-4 mt-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Chart of Accounts</h2>
                        {accounts.length === 0 && (
                            <Button onClick={seedAccounts}><Plus className="h-4 w-4 mr-2" />Seed Default Accounts</Button>
                        )}
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Subtype</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-mono">{account.code}</TableCell>
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell><Badge variant="outline">{account.account_type}</Badge></TableCell>
                                        <TableCell>{account.subtype}</TableCell>
                                        <TableCell>{account.currency}</TableCell>
                                        <TableCell><Badge variant={account.active ? 'default' : 'secondary'}>{account.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Journal Entry Modal */}
            <Dialog open={showJournalModal} onOpenChange={setShowJournalModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Journal Entry</DialogTitle>
                        <DialogDescription>Double-entry accounting journal</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateJournal} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={journalForm.entry_date} onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={journalForm.description} onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })} placeholder="Entry description" />
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Journal Lines</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addJournalLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                        <TableHead>Memo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {journalForm.lines.map((line, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Select value={line.account_id} onValueChange={(v) => updateJournalLine(index, 'account_id', v)}>
                                                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                                    <SelectContent className="z-[9999]">
                                                        {accounts.map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell><Input type="number" step="0.01" value={line.debit_amount || ''} onChange={(e) => updateJournalLine(index, 'debit_amount', e.target.value)} className="text-right" /></TableCell>
                                            <TableCell><Input type="number" step="0.01" value={line.credit_amount || ''} onChange={(e) => updateJournalLine(index, 'credit_amount', e.target.value)} className="text-right" /></TableCell>
                                            <TableCell><Input value={line.memo || ''} onChange={(e) => updateJournalLine(index, 'memo', e.target.value)} placeholder="Optional" /></TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold">
                                        <TableCell>Total</TableCell>
                                        <TableCell className="text-right">{formatCurrency(journalTotals.debit)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(journalTotals.credit)}</TableCell>
                                        <TableCell>{journalIsBalanced ? <Badge className="bg-green-500">Balanced</Badge> : <Badge variant="destructive">Unbalanced</Badge>}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowJournalModal(false)}>Cancel</Button>
                            <Button type="submit" disabled={!journalIsBalanced}>Create Entry</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Expense Modal */}
            <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Expense</DialogTitle>
                        <DialogDescription>Create expense with automatic journal posting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateExpense} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount (AED)</Label>
                                <Input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            <Input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} placeholder="Vendor name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Expense Category</Label>
                                <Select value={expenseForm.expense_account_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, expense_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">{expenseAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Paid From</Label>
                                <Select value={expenseForm.paid_from_account_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, paid_from_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">{bankAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} placeholder="Optional notes" rows={2} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
                            <Button type="submit">Record Expense</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Transfer Modal */}
            <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Account Transfer</DialogTitle>
                        <DialogDescription>Transfer between accounts with automatic journal posting</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTransfer} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount (AED)</Label>
                                <Input type="number" step="0.01" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From Account</Label>
                                <Select value={transferForm.source_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, source_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">{assetAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>To Account</Label>
                                <Select value={transferForm.destination_account_id} onValueChange={(v) => setTransferForm({ ...transferForm, destination_account_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">{assetAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} placeholder="Optional notes" rows={2} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
                            <Button type="submit">Create Transfer</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinanceDashboardPage;
