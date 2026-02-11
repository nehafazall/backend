import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus, RefreshCw, FileText, Building2, CreditCard, ArrowRightLeft, Receipt, PieChart
} from 'lucide-react';
import { DashboardContent } from '@/components/finance/DashboardContent';
import { JournalTab, SettlementsTab, ExpensesTab, TransfersTab, AccountsTab } from '@/components/finance/FinanceTabs';
import { JournalModal, ExpenseModal, TransferModal } from '@/components/finance/FinanceModals';

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
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/accounting/accounts');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchJournalEntries = async () => {
        try {
            const response = await api.get('/accounting/journal-entries?limit=50');
            setJournalEntries(response.data.entries || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchSettlements = async () => {
        try {
            const response = await api.get('/accounting/settlements');
            setSettlements(response.data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchExpenses = async () => {
        try {
            const response = await api.get('/accounting/expenses');
            setExpenses(response.data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchTransfers = async () => {
        try {
            const response = await api.get('/accounting/transfers');
            setTransfers(response.data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const seedAccounts = async () => {
        try {
            await api.post('/accounting/accounts/seed');
            toast.success('Accounts seeded');
            fetchAccounts();
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed');
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
            toast.error('Entry not balanced');
            return;
        }

        try {
            await api.post('/accounting/journal-entries', {
                ...journalForm,
                lines: journalForm.lines.filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
            });
            toast.success('Created');
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
            toast.success('Recorded');
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
            toast.success('Recorded');
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
            await api.post(`/accounting/journal-entries/${entryId}/${action}`);
            toast.success(action === 'submit' ? 'Submitted' : 'Approved');
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
            <PageHeader accounts={accounts} onRefresh={fetchDashboardData} onSeedAccounts={seedAccounts} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="dashboard"><PieChart className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
                    <TabsTrigger value="journal"><FileText className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Journal</span></TabsTrigger>
                    <TabsTrigger value="settlements"><CreditCard className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Settlements</span></TabsTrigger>
                    <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Expenses</span></TabsTrigger>
                    <TabsTrigger value="transfers"><ArrowRightLeft className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Transfers</span></TabsTrigger>
                    <TabsTrigger value="accounts"><Building2 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Accounts</span></TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                    <DashboardContent data={dashboardData} />
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

const PageHeader = ({ accounts, onRefresh, onSeedAccounts }) => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
            <p className="text-muted-foreground">Double-Entry Accounting & CFO Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
            {accounts.length === 0 && (
                <Button onClick={onSeedAccounts}>
                    <Plus className="h-4 w-4 mr-2" />Seed Accounts
                </Button>
            )}
        </div>
    </div>
);

export default FinanceDashboardPage;
