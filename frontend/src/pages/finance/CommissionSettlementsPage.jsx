import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Coins, RefreshCw, Plus, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const CommissionSettlementsPage = () => {
    const [settlements, setSettlements] = useState([]);
    const [pendingCommissions, setPendingCommissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedCommissions, setSelectedCommissions] = useState([]);
    const [paymentRef, setPaymentRef] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [settlementsRes, commissionsRes] = await Promise.all([
                api.get('/commission-settlements'),
                api.get('/commissions?status=pending&limit=100')
            ]);
            setSettlements(settlementsRes.data || []);
            setPendingCommissions(commissionsRes.data || []);
        } catch (error) {
            console.error('Error:', error);
            setSettlements([]);
            setPendingCommissions([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleCommission = (commId) => {
        setSelectedCommissions(prev => 
            prev.includes(commId) 
                ? prev.filter(id => id !== commId)
                : [...prev, commId]
        );
    };

    const handleCreateSettlement = async () => {
        if (selectedCommissions.length === 0) {
            toast.error('Select at least one commission');
            return;
        }

        try {
            await api.post('/commission-settlements', {
                commission_ids: selectedCommissions,
                payment_reference: paymentRef
            });
            toast.success('Settlement created');
            setShowModal(false);
            setSelectedCommissions([]);
            setPaymentRef('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const selectedTotal = pendingCommissions
        .filter(c => selectedCommissions.includes(c.id))
        .reduce((sum, c) => sum + c.amount, 0);

    // Group pending by agent
    const byAgent = pendingCommissions.reduce((acc, comm) => {
        const key = comm.user_name || comm.user_id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(comm);
        return acc;
    }, {});

    return (
        <div className="space-y-6" data-testid="commission-settlements-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Commission Settlements</h1>
                    <p className="text-muted-foreground">Pay out agent commissions</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowModal(true)} disabled={pendingCommissions.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />Create Settlement
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Coins className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {formatCurrency(pendingCommissions.reduce((sum, c) => sum + c.amount, 0))}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Total pending across {Object.keys(byAgent).length} agents
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settlement History */}
            <Card>
                <CardHeader>
                    <CardTitle>Settlement History</CardTitle>
                    <CardDescription>Completed commission payouts</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Commissions</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {settlements.map((settlement) => (
                            <TableRow key={settlement.id}>
                                <TableCell>{formatDate(settlement.created_at)}</TableCell>
                                <TableCell className="font-mono">{settlement.payment_reference || '-'}</TableCell>
                                <TableCell>{settlement.commission_count} commissions</TableCell>
                                <TableCell className="text-right font-mono font-medium">{formatCurrency(settlement.total_amount)}</TableCell>
                                <TableCell>
                                    <Badge variant="default" className="bg-green-500">
                                        <CheckCircle className="h-3 w-3 mr-1" />Paid
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {settlements.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No settlements yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Create Settlement Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Commission Settlement</DialogTitle>
                        <DialogDescription>Select commissions to pay out</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Payment Reference</Label>
                            <Input 
                                value={paymentRef} 
                                onChange={(e) => setPaymentRef(e.target.value)}
                                placeholder="e.g., Bank Transfer #12345"
                            />
                        </div>

                        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                            {Object.entries(byAgent).map(([agent, comms]) => (
                                <div key={agent} className="p-3">
                                    <p className="font-medium mb-2">{agent}</p>
                                    <div className="space-y-2 pl-4">
                                        {comms.map((comm) => (
                                            <div key={comm.id} className="flex items-center gap-3">
                                                <Checkbox 
                                                    checked={selectedCommissions.includes(comm.id)}
                                                    onCheckedChange={() => toggleCommission(comm.id)}
                                                />
                                                <span className="text-sm flex-1">
                                                    {formatDate(comm.created_at)} - {comm.sale_type || 'Sale'}
                                                </span>
                                                <span className="font-mono text-green-600">
                                                    {formatCurrency(comm.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {pendingCommissions.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    No pending commissions to settle
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="font-medium">Selected Total:</span>
                            <span className="text-xl font-bold text-green-600">{formatCurrency(selectedTotal)}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateSettlement} disabled={selectedCommissions.length === 0}>
                            Create Settlement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommissionSettlementsPage;
