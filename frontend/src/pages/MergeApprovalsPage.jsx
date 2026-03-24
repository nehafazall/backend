import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { GitMerge, Check, X, Clock, Shield, ArrowRight, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP = {
    pending_cs_head: { label: 'Awaiting CS Head', color: 'bg-amber-500', icon: Clock },
    pending_ceo: { label: 'Awaiting CEO', color: 'bg-blue-500', icon: Shield },
    approved: { label: 'Approved & Merged', color: 'bg-emerald-500', icon: Check },
    rejected: { label: 'Rejected', color: 'bg-red-500', icon: X },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function MergeApprovalsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    const canApprove = (req) => {
        if (req.status === 'pending_cs_head' && ['cs_head', 'super_admin'].includes(user?.role)) return true;
        if (req.status === 'pending_ceo' && user?.role === 'super_admin') return true;
        return false;
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/students/merge/requests');
            setRequests(res.data || []);
        } catch { toast.error('Failed to load merge requests'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleApprove = async (req) => {
        setProcessing(true);
        try {
            await apiClient.post(`/students/merge/${req.id}/approve`);
            toast.success(req.status === 'pending_ceo' ? 'Merge approved and executed!' : 'Approved — forwarded to CEO');
            fetchRequests();
        } catch (e) { toast.error(e.response?.data?.detail || 'Approval failed'); }
        finally { setProcessing(false); }
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await apiClient.post(`/students/merge/${selectedReq.id}/reject`, { reason: rejectReason });
            toast.success('Merge request rejected');
            setShowRejectModal(false);
            setRejectReason('');
            fetchRequests();
        } catch (e) { toast.error(e.response?.data?.detail || 'Rejection failed'); }
        finally { setProcessing(false); }
    };

    const m = selectedReq?.merged_data_preview || {};

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2"><GitMerge className="h-6 w-6 text-primary" /> Merge Approvals</h2>
                <p className="text-muted-foreground text-sm mt-1">Review and approve student record merges</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground"><GitMerge className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No merge requests</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => {
                        const st = STATUS_MAP[req.status] || STATUS_MAP.pending_cs_head;
                        const StIcon = st.icon;
                        return (
                            <Card key={req.id} className="hover:border-primary/30 transition-colors" data-testid={`merge-request-${req.id}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={st.color + ' text-white text-xs'}>
                                                    <StIcon className="h-3 w-3 mr-1" />{st.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{formatDate(req.requested_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium">{req.secondary_student_name}</span>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-bold text-primary">{req.primary_student_name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Requested by {req.requested_by_name}
                                                {req.cs_head_approved_by_name && <> &middot; CS Head: <span className="text-emerald-500">{req.cs_head_approved_by_name}</span></>}
                                                {req.ceo_approved_by_name && <> &middot; CEO: <span className="text-emerald-500">{req.ceo_approved_by_name}</span></>}
                                                {req.rejected_by_name && <> &middot; Rejected by: <span className="text-red-500">{req.rejected_by_name}</span></>}
                                            </p>
                                            {req.rejection_reason && <p className="text-xs text-red-400 mt-1">Reason: {req.rejection_reason}</p>}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedReq(req)} data-testid="merge-view-details">
                                                View Details
                                            </Button>
                                            {canApprove(req) && (
                                                <>
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(req)} disabled={processing} data-testid="merge-approve-btn">
                                                        <Check className="h-3 w-3 mr-1" />Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => { setSelectedReq(req); setShowRejectModal(true); }} disabled={processing} data-testid="merge-reject-btn">
                                                        <X className="h-3 w-3 mr-1" />Reject
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detail View */}
            <Dialog open={!!selectedReq && !showRejectModal} onOpenChange={() => setSelectedReq(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><GitMerge className="h-5 w-5" /> Merge Details</DialogTitle>
                    </DialogHeader>
                    {selectedReq && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <p className="text-[10px] uppercase text-amber-500 font-medium">Secondary (Being Merged)</p>
                                    <p className="font-bold">{selectedReq.secondary_student_name}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                    <p className="text-[10px] uppercase text-emerald-500 font-medium">Primary (Keeping)</p>
                                    <p className="font-bold">{selectedReq.primary_student_name}</p>
                                </div>
                            </div>

                            {m && Object.keys(m).length > 0 && (
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm">Merged Record Preview</CardTitle></CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        {[
                                            ['Name', m.full_name, User], ['Phone', m.phone, Phone], ['Email', m.email, Mail],
                                            ['Secondary Name', m.secondary_full_name], ['Secondary Phone', m.secondary_phone], ['Additional Email', m.additional_email],
                                            ['Package', m.package_bought], ['Course', m.current_course_name], ['CS Agent', m.cs_agent_name],
                                            ['Mentor', m.mentor_name], ['Stage', m.stage], ['Classes', m.classes_attended],
                                        ].filter(([, v]) => v).map(([label, value, Icon]) => (
                                            <div key={label} className="flex justify-between py-1 border-b border-muted/30">
                                                <span className="text-muted-foreground flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</span>
                                                <span className="font-mono text-xs">{String(value)}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{formatDate(selectedReq.requested_at)}</Badge>
                                {selectedReq.cs_head_approved_at && <Badge variant="outline" className="text-xs text-emerald-500">CS Head approved {formatDate(selectedReq.cs_head_approved_at)}</Badge>}
                                {selectedReq.ceo_approved_at && <Badge variant="outline" className="text-xs text-emerald-500">CEO approved {formatDate(selectedReq.ceo_approved_at)}</Badge>}
                            </div>

                            {canApprove(selectedReq) && (
                                <DialogFooter>
                                    <Button variant="destructive" onClick={() => setShowRejectModal(true)} disabled={processing}>Reject</Button>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { handleApprove(selectedReq); setSelectedReq(null); }} disabled={processing}>
                                        {selectedReq.status === 'pending_ceo' ? 'Final Approve & Execute Merge' : 'Approve & Forward to CEO'}
                                    </Button>
                                </DialogFooter>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={showRejectModal} onOpenChange={() => setShowRejectModal(false)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject Merge Request</DialogTitle></DialogHeader>
                    <Textarea placeholder="Reason for rejection (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing}>{processing ? 'Rejecting...' : 'Reject'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
