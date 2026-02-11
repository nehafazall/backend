import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Plus, RefreshCw,
    FileText, Building2, CreditCard, Wallet, ArrowRightLeft, Receipt, PieChart, BarChart3, Calendar
} from 'lucide-react';
import { BalanceCard, KPICard, AlertCard } from '@/components/finance/FinanceCards';
import { JournalTab, SettlementsTab, ExpensesTab, TransfersTab, AccountsTab } from '@/components/finance/FinanceTabs';
import { JournalModal, ExpenseModal, TransferModal } from '@/components/finance/FinanceModals';
import { formatCurrency } from '@/components/finance/utils';

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
            toast.error(`Entry not balanced`);
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
            toast.error(error.response?.data?.detail || 'Failed');
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
            await api.post('/accounting/expenses', { ...expenseForm, amount: parseFloat(expenseForm.amount) });
            toast.success('Expense recorded');
            setShowExpenseModal(false);
            fetchExpenses();
            fetchDashboardData();
            setExpenseForm({ date: new Date().toISOString().split('T')[0], vendor: '', expense_account_id: '', amount: '', paid_from_account_id: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleCreateTransfer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounting/transfers', { ...transferForm, amount: parseFloat(transferForm.amount) });
            toast.success('Transfer recorded');
            setShowTransferModal(false);
            fetchTransfers();
            fetchDashboardData();
            setTransferForm({ date: new Date().toISOString().split('T')[0], source_account_id: '', destination_account_id: '', amount: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleJournalAction = async (entryId, action) => {
        try {
            if (action === 'submit') {
                await api.post(`/accounting/journal-entries/${entryId}/submit`);
                toast.success('Entry submitted');
            } else if (action === 'approve') {
                await api.post(`/accounting/journal-entries/${entryId}/approve`);
                toast.success('Entry approved');
            }
            fetchJournalEntries();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
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
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    {accounts.length === 0 && (
                        <Button onClick={seedAccounts} data-testid="seed-btn">
                            <Plus className="h-4 w-4 mr-2" />Seed Accounts
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

                <TabsContent value="journal" className="mt-6">
                    <JournalTab entries={journalEntries} onNewEntry={() => setShowJournalModal(true)} onAction={handleJournalAction} />
                </TabsContent>

                <TabsContent value="settlements" className="mt-6">
                    <SettlementsTab settlements={settlements} />
                </TabsContent>

                <TabsContent value="expenses" className="mt-6">
                    <ExpensesTab expenses={expenses} onNewExpense={() => setShowExpenseModal(true)} />
                </TabsContent>

                <TabsContent value="transfers" className="mt-6">
                    <TransfersTab transfers={transfers} onNewTransfer={() => setShowTransferModal(true)} />
                </TabsContent>

                <TabsContent value="accounts" className="mt-6">
                    <AccountsTab accounts={accounts} onSeedAccounts={seedAccounts} />
                </TabsContent>
            </Tabs>

            <JournalModal 
                open={showJournalModal}
                onOpenChange={setShowJournalModal}
                form={journalForm}
                setForm={setJournalForm}
                accounts={accounts}
                onSubmit={handleCreateJournal}
                addLine={addJournalLine}
                updateLine={updateJournalLine}
            />

            <ExpenseModal
                open={showExpenseModal}
                onOpenChange={setShowExpenseModal}
                form={expenseForm}
                setForm={setExpenseForm}
                expenseAccounts={expenseAccounts}
                bankAccounts={bankAccounts}
                onSubmit={handleCreateExpense}
            />

            <TransferModal
                open={showTransferModal}
                onOpenChange={setShowTransferModal}
                form={transferForm}
                setForm={setTransferForm}
                assetAccounts={assetAccounts}
                onSubmit={handleCreateTransfer}
            />
        </div>
    );
};

export default FinanceDashboardPage;
