import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowRightLeft, Check, X, Clock, Users, ChevronRight,
    Shield, AlertTriangle, MessageSquare,
} from 'lucide-react';

const TransferRequestsPage = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [agents, setAgents] = useState([]);
    const [leads, setLeads] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [showNewRequest, setShowNewRequest] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [approvalComment, setApprovalComment] = useState('');
    const [form, setForm] = useState({ entity_type: '', entity_id: '', to_agent_id: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchAll(); }, [tab]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const status = tab === 'pending' ? 'pending_first_approval' : tab === 'awaiting_ceo' ? 'pending_final_approval' : tab;
            const [reqRes, agentsRes] = await Promise.all([
                apiClient.get(`/transfers/requests?status=${status}`),
                apiClient.get('/users'),
            ]);
            setRequests(reqRes.data || []);
            setAgents(agentsRes.data?.filter(u => u.is_active) || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchEntities = async (type) => {
        try {
            if (type === 'lead') {
                const res = await apiClient.get('/leads?limit=500');
                setLeads(res.data || []);
            } else {
                const res = await apiClient.get('/students?limit=500');
                setStudents(res.data || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async () => {
        if (!form.entity_type || !form.entity_id || !form.to_agent_id || !form.reason) {
            toast.error('All fields required'); return;
        }
        setSubmitting(true);
        try {
            await apiClient.post('/transfers/request', form);
            toast.success('Transfer request submitted');
            setShowNewRequest(false);
            setForm({ entity_type: '', entity_id: '', to_agent_id: '', reason: '' });
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
        setSubmitting(false);
    };

    const handleApproval = async (action) => {
        if (!selectedRequest) return;
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/transfers/${selectedRequest.id}/approve`, { action, comment: approvalComment });
            toast.success(res.data.message);
            setShowApproveModal(false);
            setSelectedRequest(null);
            setApprovalComment('');
            fetchAll();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
        setSubmitting(false);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    const typeLabel = (t) => t === 'lead' ? 'Sales Lead' : t === 'student' ? 'CS Student' : 'Mentor Student';
    const typeColor = (t) => t === 'lead' ? 'text-blue-500' : t === 'student' ? 'text-emerald-500' : 'text-orange-500';
    const statusBadge = (s) => {
        if (s === 'pending_first_approval') return <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">Pending 1st Approval</Badge>;
        if (s === 'pending_final_approval') return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500">Awaiting CEO</Badge>;
        if (s === 'approved') return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500">Approved</Badge>;
        if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        return <Badge variant="outline">{s}</Badge>;
    };

    const canApprove = (req) => {
        const role = user?.role;
        if (req.status === 'pending_first_approval') {
            return [req.first_approver_role, 'super_admin', 'admin'].includes(role);
        }
        if (req.status === 'pending_final_approval') {
            return ['super_admin', 'admin'].includes(role);
        }
        return false;
    };

    const isManager = ['super_admin', 'admin', 'sales_manager', 'cs_head', 'team_leader', 'master_of_academics'].includes(user?.role);

    return (
        <div className="space-y-6" data-testid="transfer-requests-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ArrowRightLeft className="h-8 w-8 text-primary" /> Transfer Requests
                    </h1>
                    <p className="text-muted-foreground">Manage lead, student & mentor transfer requests with dual approval</p>
                </div>
                <Button onClick={() => { setShowNewRequest(true); setForm({ entity_type: '', entity_id: '', to_agent_id: '', reason: '' }); }} data-testid="new-transfer-btn">
                    <ArrowRightLeft className="h-4 w-4 mr-2" /> New Transfer Request
                </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="pending">Pending 1st Approval</TabsTrigger>
                    <TabsTrigger value="awaiting_ceo">Awaiting CEO</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={tab}>
                    <Card>
                        <CardContent className="pt-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                            ) : requests.length === 0 ? (
                                <div className="text-center text-muted-foreground py-12">
                                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No {tab === 'pending' ? 'pending' : tab} transfer requests</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Requested By</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell><span className={`font-medium text-sm ${typeColor(req.entity_type)}`}>{typeLabel(req.entity_type)}</span></TableCell>
                                                <TableCell className="font-medium">{req.entity_name}</TableCell>
                                                <TableCell>
                                                    <div><p className="text-sm">{req.from_agent_name}</p>{req.from_team && <p className="text-xs text-muted-foreground">{req.from_team}</p>}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div><p className="text-sm font-medium">{req.to_agent_name}</p>{req.to_team && <p className="text-xs text-muted-foreground">{req.to_team}</p>}</div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{req.reason}</TableCell>
                                                <TableCell className="text-sm">{req.requested_by_name}</TableCell>
                                                <TableCell>{statusBadge(req.status)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatDate(req.created_at)}</TableCell>
                                                <TableCell className="text-right">
                                                    {canApprove(req) && (
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Button size="sm" variant="ghost" className="text-emerald-500" onClick={() => { setSelectedRequest(req); setApprovalComment(''); setShowApproveModal(true); }}>
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setSelectedRequest(req); setApprovalComment(''); setShowApproveModal(true); }}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {req.first_approval && (
                                                        <p className="text-[10px] text-emerald-500 mt-1">1st: {req.first_approval.by}</p>
                                                    )}
                                                    {req.final_approval && (
                                                        <p className="text-[10px] text-blue-500">Final: {req.final_approval.by}</p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* New Transfer Request Modal */}
            <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Transfer Request</DialogTitle>
                        <DialogDescription>Request a lead/student transfer. Requires dual approval.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Transfer Type</label>
                            <Select value={form.entity_type} onValueChange={(v) => { setForm({ ...form, entity_type: v, entity_id: '' }); fetchEntities(v); }}>
                                <SelectTrigger data-testid="transfer-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lead">Sales Lead (Team Leader → CEO)</SelectItem>
                                    <SelectItem value="student">CS Student (CS Head → CEO)</SelectItem>
                                    <SelectItem value="mentor_student">Mentor Student (CEO only)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">{form.entity_type === 'lead' ? 'Lead' : 'Student'}</label>
                            <Select value={form.entity_id} onValueChange={(v) => setForm({ ...form, entity_id: v })}>
                                <SelectTrigger data-testid="transfer-entity"><SelectValue placeholder={`Select ${form.entity_type === 'lead' ? 'lead' : 'student'}`} /></SelectTrigger>
                                <SelectContent>
                                    {form.entity_type === 'lead' ? leads.slice(0, 100).map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.full_name} — {l.assigned_to_name || 'Unassigned'}</SelectItem>
                                    )) : students.slice(0, 100).map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.full_name} — {form.entity_type === 'student' ? (s.cs_agent_name || 'No CS') : (s.mentor_name || 'No Mentor')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Transfer To Agent</label>
                            <Select value={form.to_agent_id} onValueChange={(v) => setForm({ ...form, to_agent_id: v })}>
                                <SelectTrigger data-testid="transfer-to-agent"><SelectValue placeholder="Select target agent" /></SelectTrigger>
                                <SelectContent>
                                    {agents.filter(a => {
                                        if (form.entity_type === 'lead') return ['sales_executive', 'team_leader'].includes(a.role);
                                        if (form.entity_type === 'student') return ['cs_agent', 'cs_head'].includes(a.role);
                                        if (form.entity_type === 'mentor_student') return a.role === 'mentor';
                                        return true;
                                    }).map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.full_name} {a.team_name ? `(${a.team_name})` : ''}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Reason for Transfer</label>
                            <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Explain why this transfer is needed..." className="min-h-[80px]" data-testid="transfer-reason" />
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Approval Chain: {form.entity_type === 'lead' ? 'Team Leader → CEO' : form.entity_type === 'student' ? 'CS Head → CEO' : 'CEO Only'}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve/Reject Modal */}
            <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Transfer Request</DialogTitle>
                        <DialogDescription>
                            Transfer {selectedRequest?.entity_name} from {selectedRequest?.from_agent_name} to {selectedRequest?.to_agent_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-3">
                            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                                <p className="text-sm"><span className="text-muted-foreground">Type:</span> {typeLabel(selectedRequest.entity_type)}</p>
                                <p className="text-sm"><span className="text-muted-foreground">From:</span> {selectedRequest.from_agent_name} {selectedRequest.from_team && `(${selectedRequest.from_team})`}</p>
                                <p className="text-sm"><span className="text-muted-foreground">To:</span> {selectedRequest.to_agent_name} {selectedRequest.to_team && `(${selectedRequest.to_team})`}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {selectedRequest.reason}</p>
                                <p className="text-sm"><span className="text-muted-foreground">Requested by:</span> {selectedRequest.requested_by_name}</p>
                                {selectedRequest.first_approval && (
                                    <p className="text-sm text-emerald-500">First approved by: {selectedRequest.first_approval.by}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Comment (optional)</label>
                                <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} placeholder="Add a comment..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleApproval('reject')} disabled={submitting}>Reject</Button>
                        <Button onClick={() => handleApproval('approve')} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? 'Processing...' : 'Approve'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TransferRequestsPage;
