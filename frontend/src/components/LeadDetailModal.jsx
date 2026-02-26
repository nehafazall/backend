import React, { useState, useEffect } from 'react';
import { leadApi, useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, PhoneCall, Calendar, Clock, User, MapPin, Target, Building2, UserPlus, ArrowRightLeft, Send, CheckCircle2 } from 'lucide-react';
import { ClickToCall, CallHistory } from './ClickToCall';

const LEAD_STAGES = [
    { id: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
    { id: 'no_answer', label: 'No Answer', color: 'bg-gray-500' },
    { id: 'call_back', label: 'Call Back', color: 'bg-purple-500' },
    { id: 'warm_lead', label: 'Warm Lead', color: 'bg-yellow-500' },
    { id: 'hot_lead', label: 'Hot Lead', color: 'bg-orange-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-cyan-500' },
    { id: 'rejected', label: 'Rejected', color: 'bg-red-500' },
    { id: 'enrolled', label: 'Enrolled', color: 'bg-emerald-500' },
];

const REJECTION_REASONS = [
    { id: 'not_interested', label: 'Not Interested' },
    { id: 'budget_issue', label: 'Budget Issue' },
    { id: 'wrong_number', label: 'Wrong Number' },
    { id: 'already_enrolled', label: 'Already Enrolled Elsewhere' },
    { id: 'no_time', label: 'No Time' },
    { id: 'location_issue', label: 'Location Issue' },
    { id: 'other', label: 'Other' },
];

const LeadDetailModal = ({ open, onClose, lead, onUpdate }) => {
    const { user } = useAuth();
    const [updateData, setUpdateData] = useState({
        stage: '',
        call_notes: '',
        rejection_reason: '',
        follow_up_date: '',
    });
    const [loading, setLoading] = useState(false);
    
    // Reassignment state
    const [showReassign, setShowReassign] = useState(false);
    const [availableAgents, setAvailableAgents] = useState([]);
    const [reassignData, setReassignData] = useState({
        new_agent_id: '',
        reason: ''
    });
    const [reassignLoading, setReassignLoading] = useState(false);
    
    // Can reassign if user is team_leader, sales_manager, admin, or super_admin
    const canReassign = ['team_leader', 'sales_manager', 'admin', 'super_admin'].includes(user?.role);

    useEffect(() => {
        if (lead) {
            setUpdateData({
                stage: lead.stage || '',
                call_notes: '',
                rejection_reason: lead.rejection_reason || '',
                follow_up_date: '',
            });
            setShowReassign(false);
            setReassignData({ new_agent_id: '', reason: '' });
        }
    }, [lead]);

    useEffect(() => {
        if (showReassign && canReassign) {
            fetchAvailableAgents();
        }
    }, [showReassign]);

    const fetchAvailableAgents = async () => {
        try {
            const res = await apiClient.get('/leads/reassignment/available-agents');
            setAvailableAgents(res.data || []);
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            toast.error('Failed to load available agents');
        }
    };

    const handleRequestReassignment = async () => {
        if (!reassignData.new_agent_id) {
            toast.error('Please select an agent to reassign to');
            return;
        }
        if (!reassignData.reason.trim()) {
            toast.error('Please provide a reason for reassignment');
            return;
        }

        try {
            setReassignLoading(true);
            const res = await apiClient.post(`/leads/${lead.id}/reassignment-request`, {
                lead_id: lead.id,
                current_agent_id: lead.assigned_to || '',
                new_agent_id: reassignData.new_agent_id,
                reason: reassignData.reason
            });
            
            if (res.data.requires_approval) {
                toast.success(res.data.message, { duration: 5000 });
            } else {
                toast.success(res.data.message);
                if (onUpdate) onUpdate();
            }
            setShowReassign(false);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit reassignment request');
        } finally {
            setReassignLoading(false);
        }
    };

    const handleUpdateLead = async () => {
        if (!lead) return;
        
        const updates = {};
        if (updateData.stage && updateData.stage !== lead.stage) {
            updates.stage = updateData.stage;
        }
        if (updateData.call_notes) {
            updates.call_notes = updateData.call_notes;
        }
        if (updateData.stage === 'rejected' && updateData.rejection_reason) {
            updates.rejection_reason = updateData.rejection_reason;
        }
        if (updateData.follow_up_date) {
            updates.follow_up_date = updateData.follow_up_date;
        }
        
        if (Object.keys(updates).length === 0) {
            toast.error('No changes to update');
            return;
        }
        
        if (updates.stage === 'rejected' && !updates.rejection_reason) {
            toast.error('Please select a rejection reason');
            return;
        }
        
        try {
            setLoading(true);
            await leadApi.update(lead.id, updates);
            toast.success('Lead updated successfully');
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update lead');
        } finally {
            setLoading(false);
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

    if (!lead) return null;

    const currentStage = LEAD_STAGES.find(s => s.id === lead.stage);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Lead Details</DialogTitle>
                    <DialogDescription>
                        View and update lead information
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                    {/* Lead Info */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                                    {lead.full_name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-semibold truncate">{lead.full_name}</h3>
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                                        <span className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{lead.phone}</span>
                                            <ClickToCall 
                                                phoneNumber={lead.phone} 
                                                contactId={lead.id} 
                                                contactName={lead.full_name}
                                                variant="outline"
                                                size="sm"
                                                showLabel={false}
                                            />
                                        </span>
                                        {lead.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{lead.email}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        <Badge className={currentStage?.color}>
                                            {currentStage?.label || lead.stage}
                                        </Badge>
                                        {lead.sla_breach && (
                                            <Badge className="bg-red-500">SLA Breach</Badge>
                                        )}
                                        {lead.in_pool && (
                                            <Badge variant="outline">In Pool</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Country:</span>
                                    <span>{lead.country || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Source:</span>
                                    <span>{lead.lead_source || lead.source || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Course:</span>
                                    <span>{lead.course_of_interest || lead.course_name || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Assigned:</span>
                                    <span>{lead.assigned_to_name || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Created:</span>
                                    <span>{formatDate(lead.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Last Activity:</span>
                                    <span>{formatDate(lead.last_activity)}</span>
                                </div>
                                {lead.follow_up_date && (
                                    <div className="flex items-center gap-2 col-span-2">
                                        <Calendar className="h-4 w-4 text-amber-500" />
                                        <span className="text-amber-600 font-medium">Follow-up:</span>
                                        <span className="text-amber-600">{formatDate(lead.follow_up_date)}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* 3CX Call History */}
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-muted-foreground/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <PhoneCall className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-medium">3CX Call Center</Label>
                                    <Badge variant="outline" className="text-xs ml-auto bg-green-500/10 text-green-600 border-green-500/30">Connected</Badge>
                                </div>
                                
                                {lead.call_recording_url && (
                                    <div className="mb-3">
                                        <Label className="text-xs text-muted-foreground">Latest Recording</Label>
                                        <a 
                                            href={lead.call_recording_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                                        >
                                            🎵 Play Recording
                                        </a>
                                    </div>
                                )}
                                
                                <CallHistory contactId={lead.id} />
                            </div>
                            
                            {lead.notes && (
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                    <span className="text-muted-foreground text-sm">Notes:</span>
                                    <p className="mt-1">{lead.notes}</p>
                                </div>
                            )}
                            
                            {lead.call_notes && (
                                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <span className="text-blue-600 text-sm font-medium">Latest Call Notes:</span>
                                    <p className="mt-1 text-sm">{lead.call_notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    {/* Update Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Update Lead</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Move to Stage</Label>
                                    <Select
                                        value={updateData.stage}
                                        onValueChange={(value) => setUpdateData({ ...updateData, stage: value })}
                                    >
                                        <SelectTrigger data-testid="update-stage-select">
                                            <SelectValue placeholder="Select stage" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="z-[9999]">
                                            {LEAD_STAGES.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {updateData.stage === 'rejected' && (
                                    <div className="space-y-2">
                                        <Label>Rejection Reason *</Label>
                                        <Select
                                            value={updateData.rejection_reason}
                                            onValueChange={(value) => setUpdateData({ ...updateData, rejection_reason: value })}
                                        >
                                            <SelectTrigger data-testid="rejection-reason-select">
                                                <SelectValue placeholder="Select reason" />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="z-[9999]">
                                                {REJECTION_REASONS.map((reason) => (
                                                    <SelectItem key={reason.id} value={reason.id}>
                                                        {reason.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                
                                {['call_back', 'warm_lead', 'hot_lead', 'in_progress'].includes(updateData.stage) && (
                                    <div className="space-y-2">
                                        <Label>Follow-up Date</Label>
                                        <Input
                                            type="datetime-local"
                                            value={updateData.follow_up_date}
                                            onChange={(e) => setUpdateData({ ...updateData, follow_up_date: e.target.value })}
                                            data-testid="follow-up-date-input"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Call Notes</Label>
                                <Textarea
                                    value={updateData.call_notes}
                                    onChange={(e) => setUpdateData({ ...updateData, call_notes: e.target.value })}
                                    placeholder="Add call notes..."
                                    rows={3}
                                    data-testid="call-notes-input"
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Reassignment Section - Only for authorized roles */}
                    {canReassign && (
                        <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                                    Reassign Lead
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!showReassign ? (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Transfer this lead to another sales agent. 
                                            {user?.role === 'team_leader' && (
                                                <span className="text-amber-600"> Requires approval from Sales Manager and CEO.</span>
                                            )}
                                            {user?.role === 'sales_manager' && (
                                                <span className="text-amber-600"> Requires approval from CEO.</span>
                                            )}
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            className="border-amber-500 text-amber-700 hover:bg-amber-500/10"
                                            onClick={() => setShowReassign(true)}
                                            data-testid="show-reassign-btn"
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Request Reassignment
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Reassign To *</Label>
                                            <Select
                                                value={reassignData.new_agent_id}
                                                onValueChange={(value) => setReassignData({ ...reassignData, new_agent_id: value })}
                                            >
                                                <SelectTrigger data-testid="reassign-agent-select">
                                                    <SelectValue placeholder="Select agent" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="z-[9999]">
                                                    {availableAgents
                                                        .filter(a => a.id !== lead?.assigned_to)
                                                        .map((agent) => (
                                                            <SelectItem key={agent.id} value={agent.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{agent.full_name}</span>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {agent.current_lead_count} leads
                                                                    </Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Reason for Reassignment *</Label>
                                            <Textarea
                                                value={reassignData.reason}
                                                onChange={(e) => setReassignData({ ...reassignData, reason: e.target.value })}
                                                placeholder="Explain why this lead should be reassigned..."
                                                rows={2}
                                                data-testid="reassign-reason-input"
                                            />
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowReassign(false);
                                                    setReassignData({ new_agent_id: '', reason: '' });
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleRequestReassignment}
                                                disabled={reassignLoading}
                                                className="bg-amber-600 hover:bg-amber-700"
                                                data-testid="submit-reassign-btn"
                                            >
                                                {reassignLoading ? (
                                                    'Submitting...'
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Submit Request
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateLead} disabled={loading} data-testid="update-lead-btn">
                            {loading ? 'Updating...' : 'Update Lead'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LeadDetailModal;
