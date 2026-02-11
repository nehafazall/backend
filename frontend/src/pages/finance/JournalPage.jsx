import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Send, Check, Plus, RefreshCw } from 'lucide-react';
import { JournalModal } from '@/components/finance/FinanceModals';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const JournalPage = () => {
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        debit_account_id: '',
        credit_account_id: '',
        debit: '',
        credit: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [entriesRes, accountsRes] = await Promise.all([
                api.get('/accounting/journal-entries?limit=100'),
                api.get('/accounting/accounts')
            ]);
            setEntries(entriesRes.data.entries || []);
            setAccounts(accountsRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const debitVal = parseFloat(form.debit) || 0;
        const creditVal = parseFloat(form.credit) || 0;
        
        if (Math.abs(debitVal - creditVal) > 0.01 || debitVal <= 0) {
            toast.error('Entry not balanced');
            return;
        }

        try {
            await api.post('/accounting/journal-entries', {
                entry_date: form.entry_date,
                description: form.description,
                lines: [
                    { account_id: form.debit_account_id, debit_amount: debitVal, credit_amount: 0, memo: '' },
                    { account_id: form.credit_account_id, debit_amount: 0, credit_amount: creditVal, memo: '' }
                ]
            });
            toast.success('Entry created');
            setShowModal(false);
            fetchData();
            setForm({ entry_date: new Date().toISOString().split('T')[0], description: '', debit_account_id: '', credit_account_id: '', debit: '', credit: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleAction = async (entryId, action) => {
        try {
            await api.post(`/accounting/journal-entries/${entryId}/${action}`);
            toast.success(action === 'submit' ? 'Submitted for approval' : 'Approved and locked');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    return (
        <div className="space-y-6" data-testid="journal-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
                    <p className="text-muted-foreground">Double-entry accounting ledger</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowModal(true)} data-testid="new-entry-btn">
                        <Plus className="h-4 w-4 mr-2" />New Entry
                    </Button>
                </div>
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
                        {entries.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>{formatDate(entry.entry_date)}</TableCell>
                                <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                                <TableCell><Badge variant="outline">{entry.source_module}</Badge></TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(entry.total_debit)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(entry.total_credit)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Badge variant={entry.status === 'Approved' ? 'default' : entry.status === 'Submitted' ? 'secondary' : 'outline'}>
                                            {entry.status}
                                        </Badge>
                                        {entry.lock_status === 'LOCKED' && <Lock className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {entry.status === 'Draft' && (
                                        <Button size="sm" variant="outline" onClick={() => handleAction(entry.id, 'submit')}>
                                            <Send className="h-3 w-3 mr-1" />Submit
                                        </Button>
                                    )}
                                    {entry.status === 'Submitted' && (
                                        <Button size="sm" variant="default" onClick={() => handleAction(entry.id, 'approve')}>
                                            <Check className="h-3 w-3 mr-1" />Approve
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {entries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No journal entries yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <JournalModal 
                open={showModal}
                onOpenChange={setShowModal}
                form={form}
                setForm={setForm}
                accounts={accounts}
                onSubmit={handleCreate}
            />
        </div>
    );
};

export default JournalPage;
