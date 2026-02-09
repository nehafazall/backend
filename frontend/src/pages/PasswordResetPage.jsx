import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Key, Clock, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, User, Mail } from 'lucide-react';

const PasswordResetPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/auth/password-reset-requests');
            setRequests(response.data.requests || []);
        } catch (error) {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';

    const openProcessModal = (request) => {
        setSelectedRequest(request);
        setNewPassword('');
        setNotes('');
        setShowModal(true);
    };

    const handleProcess = async (action) => {
        if (action === 'approve' && !newPassword) {
            toast.error('Please enter a new password');
            return;
        }

        setProcessing(true);
        try {
            await api.put(`/auth/password-reset-requests/${selectedRequest.id}`, {
                action,
                new_password: action === 'approve' ? newPassword : null,
                notes
            });
            toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
            setShowModal(false);
            fetchRequests();
        } catch (error) {
            toast.error('Failed to process request');
        } finally {
            setProcessing(false);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="p-6 space-y-6" data-testid="password-reset-page">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Key className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Password Reset Requests</h1>
                        <p className="text-muted-foreground">Manage user password reset requests</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            {pendingCount} Pending
                        </Badge>
                    )}
                    <Button onClick={fetchRequests} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reset Requests ({requests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8">Loading...</p>
                    ) : requests.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No password reset requests</p>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => (
                                <RequestRow 
                                    key={req.id} 
                                    request={req} 
                                    formatDate={formatDate}
                                    onProcess={openProcessModal}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Process Password Reset</DialogTitle>
                        <DialogDescription>Review and process this password reset request</DialogDescription>
                    </DialogHeader>
                    
                    {selectedRequest && (
                        <div className="space-y-6">
                            <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{selectedRequest.user_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{selectedRequest.user_email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Requested: {formatDate(selectedRequest.requested_at)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password for user"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleProcess('approve')}
                                    disabled={processing || !newPassword}
                                    className="flex-1 bg-green-600 hover:bg-green-500"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Set Password
                                </Button>
                                <Button
                                    onClick={() => handleProcess('reject')}
                                    disabled={processing}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const RequestRow = ({ request, formatDate, onProcess }) => {
    const statusBadge = {
        pending: <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>,
        approved: <Badge className="bg-green-500/10 text-green-600">Approved</Badge>,
        rejected: <Badge className="bg-red-500/10 text-red-600">Rejected</Badge>
    };

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-medium">{request.user_name}</p>
                    <p className="text-sm text-muted-foreground">{request.user_email}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{formatDate(request.requested_at)}</span>
                {statusBadge[request.status]}
                {request.status === 'pending' && (
                    <Button size="sm" onClick={() => onProcess(request)}>Process</Button>
                )}
                {request.status === 'approved' && request.new_password && (
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{request.new_password}</span>
                )}
            </div>
        </div>
    );
};

export default PasswordResetPage;
