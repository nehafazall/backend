import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ClipboardCheck,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    FileText,
    ChevronRight,
    RefreshCw,
    MessageSquare,
} from 'lucide-react';

const HRApprovalQueuePage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [regularizationRequests, setRegularizationRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('leave');
    
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [requestType, setRequestType] = useState(null); // 'leave' or 'regularization'
    const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchPendingApprovals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/ess/pending-approvals');
            setLeaveRequests(res.data.leave_requests || []);
            setRegularizationRequests(res.data.regularization_requests || []);
        } catch (error) {
            console.error('Failed to fetch approvals:', error);
            setLeaveRequests([]);
            setRegularizationRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    const handleAction = (request, type, action) => {
        setSelectedRequest(request);
        setRequestType(type);
        setActionType(action);
        setComments('');
        setShowActionModal(true);
    };

    const handleSubmitAction = async () => {
        setSubmitting(true);
        try {
            const endpoint = requestType === 'leave' 
                ? `/ess/leave-requests/${selectedRequest.id}/action`
                : `/ess/attendance-regularization/${selectedRequest.id}/action`;
            
            await apiClient.post(endpoint, {
                action: actionType,
                comments: comments || null,
            });
            
            toast.success(`Request ${actionType}d successfully`);
            setShowActionModal(false);
            fetchPendingApprovals();
        } catch (error) {
            toast.error(error.response?.data?.detail || `Failed to ${actionType} request`);
        } finally {
            setSubmitting(false);
        }
    };

    const getApprovalStage = (request) => {
        if (request.status === 'pending_manager') return 'Manager';
        if (request.status === 'pending_hr') return 'HR';
        if (request.status === 'pending_ceo') return 'CEO';
        return request.status;
    };

    const getApprovalChainDisplay = (chain) => {
        if (!chain || chain.length === 0) return null;
        return chain.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                    step.status === 'approved' ? 'bg-emerald-500' :
                    step.status === 'rejected' ? 'bg-red-500' :
                    step.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <span className="capitalize">{step.level}</span>
                {step.user_name && <span className="text-muted-foreground">({step.user_name})</span>}
                {step.action_date && (
                    <span className="text-muted-foreground">
                        - {new Date(step.action_date).toLocaleDateString()}
                    </span>
                )}
            </div>
        ));
    };

    const totalPending = leaveRequests.length + regularizationRequests.length;

    return (
        <div className="space-y-6" data-testid="hr-approval-queue-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardCheck className="h-6 w-6 text-primary" />
                        Approval Queue
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Review and approve leave and attendance regularization requests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                        {totalPending} Pending
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchPendingApprovals}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={leaveRequests.length > 0 ? 'border-blue-500/50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{leaveRequests.length}</p>
                                <p className="text-xs text-muted-foreground">Leave Requests</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className={regularizationRequests.length > 0 ? 'border-amber-500/50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20">
                                <Clock className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{regularizationRequests.length}</p>
                                <p className="text-xs text-muted-foreground">Regularization Requests</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <User className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-muted-foreground">Your Role</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full max-w-md">
                    <TabsTrigger value="leave" className="flex-1">
                        Leave Requests
                        {leaveRequests.length > 0 && (
                            <Badge variant="destructive" className="ml-2">{leaveRequests.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="regularization" className="flex-1">
                        Regularization
                        {regularizationRequests.length > 0 && (
                            <Badge variant="destructive" className="ml-2">{regularizationRequests.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Leave Requests Tab */}
                <TabsContent value="leave" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
                            <CardDescription>Review and take action on leave applications</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : leaveRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                    <p className="text-muted-foreground">No pending leave requests</p>
                                    <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-4">
                                        {leaveRequests.map((request) => (
                                            <Card key={request.id} className="p-4" data-testid={`leave-request-${request.id}`}>
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold">{request.employee_name}</h3>
                                                            <Badge variant="secondary">{request.leave_type_name}</Badge>
                                                            <Badge variant="outline">{getApprovalStage(request)}</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">From</p>
                                                                <p>{request.start_date}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">To</p>
                                                                <p>{request.end_date}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Days</p>
                                                                <p>{request.total_days}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Submitted</p>
                                                                <p>{new Date(request.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-muted/50 p-2 rounded text-sm mb-3">
                                                            <p className="text-muted-foreground text-xs mb-1">Reason:</p>
                                                            <p>{request.reason}</p>
                                                        </div>
                                                        {request.document_url && (
                                                            <Badge variant="outline" className="mb-3">
                                                                <FileText className="h-3 w-3 mr-1" />
                                                                Document Attached
                                                            </Badge>
                                                        )}
                                                        <div className="mt-2">
                                                            <p className="text-xs text-muted-foreground mb-1">Approval Chain:</p>
                                                            {getApprovalChainDisplay(request.approval_chain)}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                                                            onClick={() => handleAction(request, 'leave', 'reject')}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            className="bg-emerald-500 hover:bg-emerald-600"
                                                            onClick={() => handleAction(request, 'leave', 'approve')}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Regularization Tab */}
                <TabsContent value="regularization" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pending Regularization Requests</CardTitle>
                            <CardDescription>Review attendance correction requests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 w-full" />
                                    ))}
                                </div>
                            ) : regularizationRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                    <p className="text-muted-foreground">No pending regularization requests</p>
                                    <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-4">
                                        {regularizationRequests.map((request) => (
                                            <Card key={request.id} className="p-4" data-testid={`reg-request-${request.id}`}>
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h3 className="font-semibold">{request.employee_name}</h3>
                                                            <Badge variant="outline">{request.date}</Badge>
                                                            <Badge variant="secondary">{getApprovalStage(request)}</Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Original In</p>
                                                                <p>{request.original_check_in || '--:--'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Requested In</p>
                                                                <p className="text-blue-500 font-medium">{request.requested_check_in}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Original Out</p>
                                                                <p>{request.original_check_out || '--:--'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground text-xs">Requested Out</p>
                                                                <p className="text-blue-500 font-medium">{request.requested_check_out}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-muted/50 p-2 rounded text-sm mb-3">
                                                            <p className="text-muted-foreground text-xs mb-1">Reason:</p>
                                                            <p>{request.reason}</p>
                                                        </div>
                                                        <div className="mt-2">
                                                            <p className="text-xs text-muted-foreground mb-1">Approval Chain:</p>
                                                            {getApprovalChainDisplay(request.approval_chain)}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                                                            onClick={() => handleAction(request, 'regularization', 'reject')}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            className="bg-emerald-500 hover:bg-emerald-600"
                                                            onClick={() => handleAction(request, 'regularization', 'approve')}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Action Modal */}
            <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
                <DialogContent data-testid="action-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === 'approve' ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            {actionType === 'approve' ? 'Approve' : 'Reject'} Request
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve' 
                                ? 'This will move the request to the next approval stage.'
                                : 'This will reject the request and notify the employee.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {selectedRequest && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="font-medium">{selectedRequest.employee_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {requestType === 'leave' 
                                        ? `${selectedRequest.leave_type_name}: ${selectedRequest.start_date} - ${selectedRequest.end_date}`
                                        : `Regularization for ${selectedRequest.date}`
                                    }
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Comments (optional)
                            </label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Add any comments for the employee..."
                                rows={3}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowActionModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmitAction}
                            disabled={submitting}
                            className={actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
                        >
                            {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HRApprovalQueuePage;
