import React, { useState, useEffect } from 'react';
import { useAuth, paymentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Plus,
    Search,
    DollarSign,
    CreditCard,
    CheckCircle,
    AlertTriangle,
    Clock,
    FileCheck,
} from 'lucide-react';

const PAYMENT_STAGES = [
    { id: 'new_payment', label: 'New Payment', color: 'bg-blue-500', icon: DollarSign },
    { id: 'pending_verification', label: 'Pending Verification', color: 'bg-orange-500', icon: Clock },
    { id: 'verified', label: 'Verified', color: 'bg-cyan-500', icon: CheckCircle },
    { id: 'reconciled', label: 'Reconciled', color: 'bg-purple-500', icon: FileCheck },
    { id: 'discrepancy', label: 'Discrepancy', color: 'bg-rose-500', icon: AlertTriangle },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-500', icon: CheckCircle },
];

const PAYMENT_METHODS = [
    { id: 'unipay', label: 'UniPay' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'tabby', label: 'Tabby' },
    { id: 'tamara', label: 'Tamara' },
    { id: 'network', label: 'Network' },
    { id: 'bank_transfer', label: 'Bank Transfer' },
    { id: 'usdt', label: 'USDT (Crypto)' },
    { id: 'cash', label: 'Cash' },
];

const formatCurrency = (amount, currency = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
    }).format(amount || 0);
};

const PaymentCard = ({ payment, onView }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div
            className={`kanban-card stage-${payment.stage} animate-fade-in cursor-pointer`}
            onClick={() => onView(payment)}
            data-testid={`payment-card-${payment.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="font-mono font-semibold text-lg">
                            {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                            {payment.payment_method?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-2 text-sm">
                {payment.transaction_id && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        <span className="font-mono text-xs truncate">{payment.transaction_id}</span>
                    </p>
                )}
                {payment.product_course && (
                    <p className="text-muted-foreground truncate">
                        {payment.product_course}
                    </p>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <Badge variant={payment.payment_type === 'upgrade' ? 'default' : 'secondary'} className="text-xs">
                    {payment.payment_type === 'upgrade' ? 'Upgrade' : 'Fresh'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                    {formatDate(payment.created_at)}
                </span>
            </div>
        </div>
    );
};

const KanbanColumn = ({ stage, payments, onView }) => {
    const stagePayments = payments.filter(p => p.stage === stage.id);
    const StageIcon = stage.icon;
    
    const totalAmount = stagePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return (
        <div className="kanban-column" data-testid={`payment-column-${stage.id}`}>
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <StageIcon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <div className="text-right">
                    <Badge variant="secondary">{stagePayments.length}</Badge>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                        {formatCurrency(totalAmount)}
                    </p>
                </div>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="space-y-3">
                    {stagePayments.map((payment) => (
                        <PaymentCard
                            key={payment.id}
                            payment={payment}
                            onView={onView}
                        />
                    ))}
                    {stagePayments.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No payments
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

const FinancePage = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [formData, setFormData] = useState({
        amount: '',
        currency: 'AED',
        payment_method: '',
        transaction_id: '',
        product_course: '',
        payment_type: 'fresh',
        notes: '',
    });
    const [updateData, setUpdateData] = useState({
        stage: '',
        notes: '',
        discrepancy_reason: '',
    });

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await paymentApi.getAll();
            setPayments(response.data);
        } catch (error) {
            toast.error('Failed to fetch payments');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        
        if (!formData.amount || !formData.payment_method) {
            toast.error('Amount and payment method are required');
            return;
        }
        
        try {
            await paymentApi.create({
                ...formData,
                amount: parseFloat(formData.amount),
            });
            toast.success('Payment recorded successfully');
            setShowCreateModal(false);
            setFormData({
                amount: '',
                currency: 'AED',
                payment_method: '',
                transaction_id: '',
                product_course: '',
                payment_type: 'fresh',
                notes: '',
            });
            fetchPayments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to record payment');
        }
    };

    const handleViewPayment = (payment) => {
        setSelectedPayment(payment);
        setUpdateData({
            stage: payment.stage,
            notes: '',
            discrepancy_reason: payment.discrepancy_reason || '',
        });
        setShowDetailModal(true);
    };

    const handleUpdatePayment = async () => {
        if (!selectedPayment) return;
        
        if (updateData.stage === 'discrepancy' && !updateData.discrepancy_reason) {
            toast.error('Please provide a discrepancy reason');
            return;
        }
        
        try {
            await paymentApi.update(selectedPayment.id, updateData);
            toast.success('Payment updated successfully');
            setShowDetailModal(false);
            fetchPayments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update payment');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6" data-testid="finance-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
                    <p className="text-muted-foreground">Manage payments and financial operations</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => setShowCreateModal(true)} data-testid="create-payment-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Record Payment
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Verified</p>
                                <p className="text-2xl font-bold font-mono text-emerald-500">
                                    {formatCurrency(
                                        payments
                                            .filter(p => ['verified', 'reconciled', 'completed'].includes(p.stage))
                                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                                    )}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold font-mono text-orange-500">
                                    {formatCurrency(
                                        payments
                                            .filter(p => ['new_payment', 'pending_verification'].includes(p.stage))
                                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                                    )}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Discrepancies</p>
                                <p className="text-2xl font-bold font-mono text-rose-500">
                                    {payments.filter(p => p.stage === 'discrepancy').length}
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-rose-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Payments</p>
                                <p className="text-2xl font-bold font-mono">{payments.length}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="kanban-board">
                    {PAYMENT_STAGES.map((stage) => (
                        <KanbanColumn
                            key={stage.id}
                            stage={stage}
                            payments={payments}
                            onView={handleViewPayment}
                        />
                    ))}
                </div>
            )}

            {/* Create Payment Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Record New Payment</DialogTitle>
                        <DialogDescription>
                            Add a new payment to the finance pipeline
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreatePayment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                    data-testid="payment-amount-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                                >
                                    <SelectTrigger data-testid="payment-currency-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AED">AED</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="INR">INR</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Method *</Label>
                                <Select
                                    value={formData.payment_method}
                                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                >
                                    <SelectTrigger data-testid="payment-method-select">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((method) => (
                                            <SelectItem key={method.id} value={method.id}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Type</Label>
                                <Select
                                    value={formData.payment_type}
                                    onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                                >
                                    <SelectTrigger data-testid="payment-type-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fresh">Fresh</SelectItem>
                                        <SelectItem value="upgrade">Upgrade</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="transaction_id">Transaction ID</Label>
                            <Input
                                id="transaction_id"
                                value={formData.transaction_id}
                                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                                placeholder="TXN-XXXXXX"
                                data-testid="payment-txn-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="product_course">Product/Course</Label>
                            <Select
                                value={formData.product_course}
                                onValueChange={(value) => setFormData({ ...formData, product_course: value })}
                            >
                                <SelectTrigger data-testid="payment-product-select">
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic_trading">Basic Trading</SelectItem>
                                    <SelectItem value="advanced_trading">Advanced Trading</SelectItem>
                                    <SelectItem value="mentorship">Mentorship Program</SelectItem>
                                    <SelectItem value="market_code">Market Code</SelectItem>
                                    <SelectItem value="profit_matrix">Profit Matrix</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add any additional notes..."
                                rows={2}
                                data-testid="payment-notes-input"
                            />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" data-testid="submit-payment-btn">
                                Record Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Payment Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment Details</DialogTitle>
                        <DialogDescription>
                            View and verify payment information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedPayment && (
                        <div className="space-y-6">
                            {/* Payment Info */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                                            <DollarSign className="h-8 w-8 text-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-3xl font-bold font-mono">
                                                {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className={PAYMENT_STAGES.find(s => s.id === selectedPayment.stage)?.color}>
                                                    {PAYMENT_STAGES.find(s => s.id === selectedPayment.stage)?.label}
                                                </Badge>
                                                <Badge variant={selectedPayment.payment_type === 'upgrade' ? 'default' : 'secondary'}>
                                                    {selectedPayment.payment_type === 'upgrade' ? 'Upgrade' : 'Fresh'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Payment Method:</span>
                                            <span className="ml-2 uppercase">{selectedPayment.payment_method?.replace('_', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Transaction ID:</span>
                                            <span className="ml-2 font-mono">{selectedPayment.transaction_id || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Product/Course:</span>
                                            <span className="ml-2">{selectedPayment.product_course || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Created:</span>
                                            <span className="ml-2">{formatDate(selectedPayment.created_at)}</span>
                                        </div>
                                        {selectedPayment.verified_by_name && (
                                            <div>
                                                <span className="text-muted-foreground">Verified By:</span>
                                                <span className="ml-2">{selectedPayment.verified_by_name}</span>
                                            </div>
                                        )}
                                        {selectedPayment.reconciled_at && (
                                            <div>
                                                <span className="text-muted-foreground">Reconciled:</span>
                                                <span className="ml-2">{formatDate(selectedPayment.reconciled_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {selectedPayment.discrepancy_reason && (
                                        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                                            <span className="text-rose-500 text-sm font-medium">Discrepancy Reason:</span>
                                            <p className="mt-1">{selectedPayment.discrepancy_reason}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            
                            {/* Update Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Update Payment Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Move to Stage</Label>
                                        <Select
                                            value={updateData.stage}
                                            onValueChange={(value) => setUpdateData({ ...updateData, stage: value })}
                                        >
                                            <SelectTrigger data-testid="update-payment-stage-select">
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAYMENT_STAGES.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id}>
                                                        {stage.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    {updateData.stage === 'discrepancy' && (
                                        <div className="space-y-2">
                                            <Label>Discrepancy Reason *</Label>
                                            <Textarea
                                                value={updateData.discrepancy_reason}
                                                onChange={(e) => setUpdateData({ ...updateData, discrepancy_reason: e.target.value })}
                                                placeholder="Describe the discrepancy..."
                                                rows={2}
                                                data-testid="discrepancy-reason-input"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <Label>Notes</Label>
                                        <Textarea
                                            value={updateData.notes}
                                            onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                                            placeholder="Add verification notes..."
                                            rows={2}
                                            data-testid="payment-update-notes-input"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdatePayment} data-testid="update-payment-btn">
                                    Update Payment
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinancePage;
