import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw } from 'lucide-react';
import { ExpenseModal } from '@/components/finance/FinanceModals';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const ExpensesPage = () => {
    const [expenses, setExpenses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        expense_account_id: '',
        amount: '',
        paid_from_account_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [expensesRes, accountsRes] = await Promise.all([
                api.get('/accounting/expenses'),
                api.get('/accounting/accounts')
            ]);
            setExpenses(expensesRes.data || []);
            setAccounts(accountsRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounting/expenses', { ...form, amount: parseFloat(form.amount) });
            toast.success('Expense recorded');
            setShowModal(false);
            fetchData();
            setForm({ date: new Date().toISOString().split('T')[0], vendor: '', expense_account_id: '', amount: '', paid_from_account_id: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const expenseAccounts = accounts.filter(a => a.account_type === 'Expense');
    const bankAccounts = accounts.filter(a => ['Bank', 'Wallet', 'Cash'].includes(a.subtype));

    return (
        <div className="space-y-6" data-testid="expenses-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
                    <p className="text-muted-foreground">Track and manage business expenses</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowModal(true)} data-testid="new-expense-btn">
                        <Plus className="h-4 w-4 mr-2" />Record Expense
                    </Button>
                </div>
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
                                <TableCell>
                                    <Badge variant={expense.status === 'Approved' ? 'default' : 'secondary'}>{expense.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {expenses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No expenses recorded yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <ExpenseModal
                open={showModal}
                onOpenChange={setShowModal}
                form={form}
                setForm={setForm}
                expenseAccounts={expenseAccounts}
                bankAccounts={bankAccounts}
                onSubmit={handleCreate}
            />
        </div>
    );
};

export default ExpensesPage;
