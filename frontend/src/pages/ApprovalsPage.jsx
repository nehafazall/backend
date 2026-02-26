import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    CheckCircle,
    XCircle,
    Clock,
    User,
    ArrowRight,
    Phone,
    FileText,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';

function ApprovalCard({ request, onApprove, onReject, isPending }) {
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending_approval':
                return <Badge className="bg-amber-500">Pending</Badge>;
            case 'approved':
                return <Badge className="bg-emerald-500">Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleReject = () => {
        onReject(request.id, rejectionReason);
        setShowRejectDialog(false);
        setRejectionReason('');
    };

    return (
        <>
            <Card className="hover:shadow-md transition-shadow" data-testid={`approval-card-${request.id}`}>
                <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {getStatusBadge(request.status)}
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(request.created_at)}
                                </span>
                            </div>
                            <h3 className="font-semibold text-lg">Lead Reassignment Request</h3>
                        </div>
                    </div>

                    {/* Lead Info */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{request.lead_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{request.lead_phone}</span>
                        </div>
                    </div>

                    {/* Transfer Details */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 text-center p-2 bg-red-500/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">From</p>
                            <p className="font-medium text-red-600">{request.current_agent_name}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 text-center p-2 bg-emerald-500/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">To</p>
                            <p className="font-medium text-emerald-600">{request.new_agent_name}</p>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Reason</span>
                        </div>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                            {request.reason}
                        </p>
                    </div>

                    {/* Requested By */}
                    <div className="text-sm text-muted-foreground mb-4">
                        Requested by: <span className="font-medium">{request.requested_by_name}</span>
                        <span className="text-xs ml-1">({request.requested_by_role?.replace('_', ' ')})</span>
                    </div>

                    {/* Approval Chain */}
                    <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Approval Chain:</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            {request.approval_chain?.map((step, index) => (
                                <div key={index} className="flex items-center gap-1">
                                    <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                                        step.status === 'approved' ? 'bg-emerald-500/20 text-emerald-700' :
                                        step.status === 'rejected' ? 'bg-red-500/20 text-red-700' :
                                        step.status === 'pending' ? 'bg-amber-500/20 text-amber-700' :
                                        'bg-muted'
                                    }`}>
                                        {step.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                                        {step.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                        {step.status === 'pending' && <Clock className="h-3 w-3" />}
                                        {step.user_name} ({step.role?.replace('_', ' ')})
                                    </div>
                                    {index < request.approval_chain.length - 1 && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rejection Reason (if rejected) */}
                    {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-medium text-red-700">Rejection Reason</span>
                            </div>
                            <p className="text-sm text-red-600">{request.rejection_reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Rejected by {request.rejected_by_name} on {formatDate(request.rejected_at)}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {isPending && (
                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                variant="outline"
                                className="flex-1 border-red-500 text-red-600 hover:bg-red-500/10"
                                onClick={() => setShowRejectDialog(true)}
                                data-testid="reject-btn"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => onApprove(request.id)}
                                data-testid="approve-btn"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rejection Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Reassignment Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter reason for rejection..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleReject}
                            disabled={!rejectionReason.trim()}
                        >
                            Reject Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ApprovalsPage() {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [pendingRes, allRes] = await Promise.all([
                apiClient.get('/leads/reassignment-requests/pending'),
                apiClient.get('/leads/reassignment-requests')
            ]);
            setPendingRequests(pendingRes.data || []);
            setAllRequests(allRes.data || []);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
            toast.error('Failed to load approval requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        try {
            const res = await apiClient.post(`/leads/reassignment-requests/${requestId}/approve`);
            toast.success(res.data.message);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to approve request');
        }
    };

    const handleReject = async (requestId, reason) => {
        try {
            const res = await apiClient.post(`/leads/reassignment-requests/${requestId}/reject?rejection_reason=${encodeURIComponent(reason)}`);
            toast.success(res.data.message);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reject request');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="approvals-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Approval Requests</h1>
                    <p className="text-muted-foreground">
                        Review and approve lead reassignment requests
                    </p>
                </div>
                <Button variant="outline" onClick={fetchRequests}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-amber-500/20">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Your Approval</p>
                                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-emerald-500/20">
                                <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Approved</p>
                                <p className="text-2xl font-bold">
                                    {allRequests.filter(r => r.status === 'approved').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-500/20">
                                <XCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Rejected</p>
                                <p className="text-2xl font-bold">
                                    {allRequests.filter(r => r.status === 'rejected').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="pending" className="relative">
                        Pending Approval
                        {pendingRequests.length > 0 && (
                            <Badge className="ml-2 bg-amber-500">{pendingRequests.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all">All Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                    {pendingRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                                <p className="text-muted-foreground">No pending approval requests</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {pendingRequests.map((request) => (
                                <ApprovalCard
                                    key={request.id}
                                    request={request}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    isPending={true}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                    {allRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">No Requests Yet</h3>
                                <p className="text-muted-foreground">No reassignment requests have been submitted</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {allRequests.map((request) => (
                                <ApprovalCard
                                    key={request.id}
                                    request={request}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    isPending={request.status === 'pending_approval' && pendingRequests.some(p => p.id === request.id)}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default ApprovalsPage;
