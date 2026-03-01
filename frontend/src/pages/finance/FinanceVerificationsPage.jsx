import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    User,
    Phone,
    Mail,
    Calendar,
    FileCheck,
    AlertTriangle,
    Loader2,
    RefreshCw,
    Receipt,
    CreditCard,
    ImageIcon,
    ExternalLink,
} from 'lucide-react';

const STATUS_CONFIG = {
    pending_verification: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
    verified: { label: 'Verified', color: 'bg-green-500', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
};

export default function FinanceVerificationsPage() {
    const [verifications, setVerifications] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [processing, setProcessing] = useState(false);
    
    const [verifyData, setVerifyData] = useState({
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    
    const [rejectReason, setRejectReason] = useState('');
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [detailVerification, setDetailVerification] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [verificationsRes, transactionsRes] = await Promise.all([
                api.get('/finance/verifications'),
                api.get('/finance/transactions')
            ]);
            setVerifications(verificationsRes.data || []);
            setTransactions(transactionsRes.data?.transactions || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVerify = async () => {
        if (!selectedVerification) return;
        
        try {
            setProcessing(true);
            await api.post(`/finance/verifications/${selectedVerification.id}/verify`, verifyData);
            toast.success('Payment verified and transaction recorded');
            setShowVerifyDialog(false);
            setSelectedVerification(null);
            setVerifyData({ payment_reference: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to verify payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedVerification || !rejectReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        
        try {
            setProcessing(true);
            await api.post(`/finance/verifications/${selectedVerification.id}/reject`, {
                rejection_reason: rejectReason
            });
            toast.success('Verification rejected');
            setShowRejectDialog(false);
            setSelectedVerification(null);
            setRejectReason('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reject');
        } finally {
            setProcessing(false);
        }
    };

    const pendingCount = verifications.filter(v => v.status === 'pending_verification').length;
    const totalPendingAmount = verifications
        .filter(v => v.status === 'pending_verification')
        .reduce((sum, v) => sum + (v.sale_amount || 0), 0);

    return (
        <div className="space-y-6" data-testid="finance-verifications-page">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Finance Verifications</h1>
                    <p className="text-muted-foreground">
                        Verify enrollment payments and manage transactions
                    </p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Verification</p>
                                <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Amount</p>
                                <p className="text-2xl font-bold text-orange-500">
                                    AED {totalPendingAmount.toLocaleString()}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-orange-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Verified Today</p>
                                <p className="text-2xl font-bold text-green-500">
                                    {verifications.filter(v => 
                                        v.status === 'verified' && 
                                        v.verified_at?.startsWith(new Date().toISOString().split('T')[0])
                                    ).length}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Transactions</p>
                                <p className="text-2xl font-bold text-blue-500">{transactions.length}</p>
                            </div>
                            <Receipt className="h-8 w-8 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending" className="relative">
                        Pending Verification
                        {pendingCount > 0 && (
                            <Badge className="ml-2 bg-yellow-500">{pendingCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="verified">Verified</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                {/* Pending Tab */}
                <TabsContent value="pending">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment Method</TableHead>
                                    <TableHead>Sales Executive</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifications.filter(v => v.status === 'pending_verification').length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No pending verifications
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    verifications.filter(v => v.status === 'pending_verification').map((v) => (
                                        <TableRow key={v.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{v.customer_name}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {v.phone}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{v.course_name || '-'}</TableCell>
                                            <TableCell>
                                                <span className="font-bold text-green-500">
                                                    AED {v.sale_amount?.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <CreditCard className="h-3 w-3" />
                                                    <span className="capitalize">{v.payment_method?.replace('_', ' ') || '-'}</span>
                                                    {v.payment_proof && (
                                                        <Badge variant="secondary" className="ml-1 text-xs">Proof</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{v.sales_executive_name || '-'}</TableCell>
                                            <TableCell>
                                                {new Date(v.submitted_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setDetailVerification(v);
                                                            setShowDetailDialog(true);
                                                        }}
                                                        data-testid={`view-verification-${v.id}`}
                                                    >
                                                        View Details
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        className="bg-green-500 hover:bg-green-600"
                                                        onClick={() => {
                                                            setSelectedVerification(v);
                                                            setShowVerifyDialog(true);
                                                        }}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Verify
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setSelectedVerification(v);
                                                            setShowRejectDialog(true);
                                                        }}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Verified Tab */}
                <TabsContent value="verified">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Verified By</TableHead>
                                    <TableHead>Verified At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifications.filter(v => v.status === 'verified').map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">{v.customer_name}</TableCell>
                                        <TableCell>{v.course_name || '-'}</TableCell>
                                        <TableCell className="font-bold text-green-500">
                                            AED {v.sale_amount?.toLocaleString()}
                                        </TableCell>
                                        <TableCell>{v.verified_by_name}</TableCell>
                                        <TableCell>
                                            {v.verified_at ? new Date(v.verified_at).toLocaleString() : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Rejected Tab */}
                <TabsContent value="rejected">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Rejection Reason</TableHead>
                                    <TableHead>Rejected By</TableHead>
                                    <TableHead>Rejected At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifications.filter(v => v.status === 'rejected').map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">{v.customer_name}</TableCell>
                                        <TableCell className="text-red-500">
                                            AED {v.sale_amount?.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="destructive">{v.rejection_reason}</Badge>
                                        </TableCell>
                                        <TableCell>{v.verified_by_name}</TableCell>
                                        <TableCell>
                                            {v.verified_at ? new Date(v.verified_at).toLocaleString() : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment Method</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}...</TableCell>
                                        <TableCell className="font-medium">{t.customer_name}</TableCell>
                                        <TableCell>{t.course_name || '-'}</TableCell>
                                        <TableCell className="font-bold text-green-500">
                                            AED {t.amount?.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{t.payment_method || '-'}</Badge>
                                        </TableCell>
                                        <TableCell>{t.payment_date}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Verify Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Verify Payment
                        </DialogTitle>
                        <DialogDescription>
                            Confirm that payment has been received for this enrollment.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedVerification && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">{selectedVerification.customer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Course:</span>
                                    <span>{selectedVerification.course_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-bold text-green-500">
                                        AED {selectedVerification.sale_amount?.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment Method:</span>
                                    <span className="capitalize">{selectedVerification.payment_method?.replace('_', ' ') || 'N/A'}</span>
                                </div>
                                {selectedVerification.transaction_id && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Transaction ID:</span>
                                        <span className="font-mono">{selectedVerification.transaction_id}</span>
                                    </div>
                                )}
                                {selectedVerification.payment_date && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Payment Date:</span>
                                        <span>{new Date(selectedVerification.payment_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {selectedVerification.payment_notes && (
                                    <div className="pt-2 border-t">
                                        <span className="text-muted-foreground text-sm">Sales Notes:</span>
                                        <p className="text-sm mt-1">{selectedVerification.payment_notes}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Payment Proof Image */}
                            {selectedVerification.payment_proof && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Payment Proof Screenshot
                                    </Label>
                                    <div className="border rounded-lg p-2 bg-muted/50">
                                        <img 
                                            src={selectedVerification.payment_proof} 
                                            alt="Payment proof" 
                                            className="max-h-64 mx-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => window.open(selectedVerification.payment_proof, '_blank')}
                                        />
                                        {selectedVerification.payment_proof_filename && (
                                            <p className="text-xs text-muted-foreground text-center mt-2">
                                                {selectedVerification.payment_proof_filename}
                                            </p>
                                        )}
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full mt-2"
                                            onClick={() => window.open(selectedVerification.payment_proof, '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open Full Size
                                        </Button>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <Label>Payment Reference / Receipt No.</Label>
                                <Input
                                    value={verifyData.payment_reference}
                                    onChange={(e) => setVerifyData({ ...verifyData, payment_reference: e.target.value })}
                                    placeholder="e.g., TXN123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Date</Label>
                                <Input
                                    type="date"
                                    value={verifyData.payment_date}
                                    onChange={(e) => setVerifyData({ ...verifyData, payment_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Textarea
                                    value={verifyData.notes}
                                    onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleVerify} disabled={processing} className="bg-green-500 hover:bg-green-600">
                            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Confirm Verification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            Reject Verification
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reject the payment verification and notify the sales executive.
                            The lead will be moved back to "In Progress" stage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label>Rejection Reason *</Label>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please explain why this payment is being rejected..."
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReject}
                            disabled={processing || !rejectReason.trim()}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Reject
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
