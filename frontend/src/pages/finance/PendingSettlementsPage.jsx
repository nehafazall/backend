import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    DollarSign,
    CreditCard,
    Calendar,
    Loader2,
    RefreshCw,
    Building2,
    Smartphone,
    TrendingUp,
} from 'lucide-react';

const GATEWAY_CONFIG = {
    tabby: { 
        label: 'Tabby', 
        icon: Smartphone, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10',
        settlement: 'Every Monday'
    },
    tamara: { 
        label: 'Tamara', 
        icon: Smartphone, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10',
        settlement: '7 days from payment'
    },
    network: { 
        label: 'Network', 
        icon: CreditCard, 
        color: 'text-orange-500', 
        bg: 'bg-orange-500/10',
        settlement: 'T+1 (Next business day)'
    },
    cheque: { 
        label: 'Cheque', 
        icon: Building2, 
        color: 'text-gray-500', 
        bg: 'bg-gray-500/10',
        settlement: 'Manual processing'
    },
};

const PendingSettlementsPage = () => {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGateway, setSelectedGateway] = useState('all');
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [selectedSettlement, setSelectedSettlement] = useState(null);
    const [settleData, setSettleData] = useState({
        settlement_date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
    });
    const [processing, setProcessing] = useState(false);
    const [summary, setSummary] = useState({
        total_receivable: 0,
        total_count: 0,
        overdue_count: 0,
        overdue_amount: 0,
    });
    const [byGateway, setByGateway] = useState({});

    const fetchSettlements = useCallback(async () => {
        try {
            setLoading(true);
            const params = selectedGateway !== 'all' ? { payment_gateway: selectedGateway } : {};
            const res = await apiClient.get('/finance/pending-settlements', { params });
            setSettlements(res.data.settlements || []);
            setSummary(res.data.summary || {});
            setByGateway(res.data.by_gateway || {});
        } catch (error) {
            console.error('Failed to fetch settlements:', error);
            toast.error('Failed to load pending settlements');
        } finally {
            setLoading(false);
        }
    }, [selectedGateway]);

    useEffect(() => {
        fetchSettlements();
    }, [fetchSettlements]);

    const handleMarkSettled = async () => {
        if (!selectedSettlement) return;
        
        setProcessing(true);
        try {
            await apiClient.post(`/finance/pending-settlements/${selectedSettlement.id}/mark-settled`, settleData);
            toast.success('Settlement marked as received');
            setShowSettleModal(false);
            setSelectedSettlement(null);
            setSettleData({
                settlement_date: new Date().toISOString().split('T')[0],
                reference: '',
                notes: '',
            });
            fetchSettlements();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to mark settlement');
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const isOverdue = (expectedDate) => {
        if (!expectedDate) return false;
        const today = new Date().toISOString().split('T')[0];
        return expectedDate < today;
    };

    const getGatewayConfig = (gateway) => {
        return GATEWAY_CONFIG[gateway?.toLowerCase()] || {
            label: gateway,
            icon: CreditCard,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            settlement: 'Varies'
        };
    };

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6" data-testid="pending-settlements-page">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Pending Settlements</h1>
                    <p className="text-muted-foreground">
                        Track and manage payment gateway settlements
                    </p>
                </div>
                <Button onClick={fetchSettlements} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Receivable</p>
                                <p className="text-2xl font-bold text-primary">
                                    {formatCurrency(summary.total_receivable)}
                                </p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-full">
                                <TrendingUp className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Count</p>
                                <p className="text-2xl font-bold">{summary.total_count}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <Clock className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className={summary.overdue_count > 0 ? 'border-red-500/50' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Overdue</p>
                                <p className={`text-2xl font-bold ${summary.overdue_count > 0 ? 'text-red-500' : ''}`}>
                                    {summary.overdue_count}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${summary.overdue_count > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                                <AlertTriangle className={`h-6 w-6 ${summary.overdue_count > 0 ? 'text-red-500' : 'text-gray-500'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className={summary.overdue_amount > 0 ? 'border-red-500/50' : ''}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Overdue Amount</p>
                                <p className={`text-2xl font-bold ${summary.overdue_amount > 0 ? 'text-red-500' : ''}`}>
                                    {formatCurrency(summary.overdue_amount)}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${summary.overdue_amount > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'}`}>
                                <DollarSign className={`h-6 w-6 ${summary.overdue_amount > 0 ? 'text-red-500' : 'text-gray-500'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gateway Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(GATEWAY_CONFIG).map(([key, config]) => {
                    const gatewayData = byGateway[key] || { count: 0, total: 0 };
                    const Icon = config.icon;
                    return (
                        <Card 
                            key={key} 
                            className={`cursor-pointer transition-all hover:shadow-md ${selectedGateway === key ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => setSelectedGateway(selectedGateway === key ? 'all' : key)}
                        >
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${config.bg}`}>
                                        <Icon className={`h-5 w-5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{config.label}</p>
                                        <p className="text-xs text-muted-foreground">{config.settlement}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">{gatewayData.count} pending</span>
                                    <span className={`font-bold ${config.color}`}>
                                        {formatCurrency(gatewayData.total)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Settlements Table */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Pending Settlements</CardTitle>
                        {selectedGateway !== 'all' && (
                            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedGateway('all')}>
                                {GATEWAY_CONFIG[selectedGateway]?.label} only - Click to clear filter
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Gateway</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Payment Date</TableHead>
                                <TableHead>Expected Settlement</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                                        <p>No pending settlements</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                settlements.map((s) => {
                                    const config = getGatewayConfig(s.payment_gateway);
                                    const overdue = isOverdue(s.expected_settlement_date);
                                    const Icon = config.icon;
                                    
                                    return (
                                        <TableRow key={s.id} className={overdue ? 'bg-red-500/5' : ''}>
                                            <TableCell>
                                                <p className="font-medium">{s.customer_name}</p>
                                                <p className="text-xs text-muted-foreground">{s.sales_executive_name}</p>
                                            </TableCell>
                                            <TableCell>{s.course_name || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                                    <span>{config.label}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(s.amount)}
                                                </span>
                                            </TableCell>
                                            <TableCell>{formatDate(s.payment_date)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className={`h-4 w-4 ${overdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                                                    <span className={overdue ? 'text-red-500 font-medium' : ''}>
                                                        {formatDate(s.expected_settlement_date)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {overdue ? (
                                                    <Badge variant="destructive">Overdue</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Pending</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedSettlement(s);
                                                        setShowSettleModal(true);
                                                    }}
                                                    data-testid={`settle-${s.id}`}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Mark Settled
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mark Settled Dialog */}
            <Dialog open={showSettleModal} onOpenChange={setShowSettleModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark Settlement as Received</DialogTitle>
                        <DialogDescription>
                            Confirm that the settlement for {selectedSettlement?.customer_name} has been received.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedSettlement && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">{selectedSettlement.customer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gateway:</span>
                                    <span className="capitalize">{selectedSettlement.payment_gateway}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-bold text-emerald-600">
                                        {formatCurrency(selectedSettlement.amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expected:</span>
                                    <span>{formatDate(selectedSettlement.expected_settlement_date)}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Actual Settlement Date</Label>
                                <Input
                                    type="date"
                                    value={settleData.settlement_date}
                                    onChange={(e) => setSettleData({ ...settleData, settlement_date: e.target.value })}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Settlement Reference</Label>
                                <Input
                                    value={settleData.reference}
                                    onChange={(e) => setSettleData({ ...settleData, reference: e.target.value })}
                                    placeholder="Bank reference or transaction ID"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Textarea
                                    value={settleData.notes}
                                    onChange={(e) => setSettleData({ ...settleData, notes: e.target.value })}
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSettleModal(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleMarkSettled} disabled={processing}>
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Settlement
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingSettlementsPage;
