import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, ChevronRight } from 'lucide-react';
import { TransferModal } from '@/components/finance/FinanceModals';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const TransfersPage = () => {
    const [transfers, setTransfers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        source_account_id: '',
        destination_account_id: '',
        amount: '',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [transfersRes, accountsRes] = await Promise.all([
                api.get('/accounting/transfers'),
                api.get('/accounting/accounts')
            ]);
            setTransfers(transfersRes.data || []);
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
            await api.post('/accounting/transfers', { ...form, amount: parseFloat(form.amount) });
            toast.success('Transfer recorded');
            setShowModal(false);
            fetchData();
            setForm({ date: new Date().toISOString().split('T')[0], source_account_id: '', destination_account_id: '', amount: '', notes: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const assetAccounts = accounts.filter(a => a.account_type === 'Asset');

    return (
        <div className="space-y-6" data-testid="transfers-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Account Transfers</h1>
                    <p className="text-muted-foreground">Inter-account fund movements</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowModal(true)} data-testid="new-transfer-btn">
                        <Plus className="h-4 w-4 mr-2" />New Transfer
                    </Button>
                </div>
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
                                <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                                <TableCell className="font-medium">{transfer.destination_account_name}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(transfer.amount, transfer.currency)}</TableCell>
                                <TableCell>
                                    <Badge variant={transfer.status === 'Approved' ? 'default' : 'secondary'}>{transfer.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {transfers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No transfers recorded yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            <TransferModal
                open={showModal}
                onOpenChange={setShowModal}
                form={form}
                setForm={setForm}
                assetAccounts={assetAccounts}
                onSubmit={handleCreate}
            />
        </div>
    );
};

export default TransfersPage;
