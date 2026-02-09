import React, { useState, useEffect } from 'react';
import { useAuth, leadApi } from '@/lib/api';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import ImportButton from '@/components/ImportButton';
import ReminderModal from '@/components/ReminderModal';
import { ClickToCall, CallHistory } from '@/components/ClickToCall';
import { COUNTRIES, LEAD_SOURCES, detectCountryFromPhone } from '@/lib/phoneCountry';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Plus,
    Search,
    Phone,
    Mail,
    MapPin,
    Calendar,
    MoreVertical,
    AlertTriangle,
    User,
    Clock,
    Bell,
    PhoneCall,
    GripVertical,
} from 'lucide-react';

const LEAD_STAGES = [
    { id: 'new_lead', label: 'New Lead', color: 'bg-blue-500' },
    { id: 'no_answer', label: 'No Answer', color: 'bg-orange-500' },
    { id: 'call_back', label: 'Call Back', color: 'bg-purple-500' },
    { id: 'warm_lead', label: 'Warm Lead', color: 'bg-yellow-500' },
    { id: 'hot_lead', label: 'Hot Lead', color: 'bg-orange-600' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-cyan-500' },
    { id: 'rejected', label: 'Rejected', color: 'bg-rose-500' },
    { id: 'enrolled', label: 'Enrolled', color: 'bg-emerald-500' },
];

const REJECTION_REASONS = [
    { id: 'price', label: 'Price' },
    { id: 'timing', label: 'Timing' },
    { id: 'no_money', label: 'No Money' },
    { id: 'wrong_number', label: 'Wrong Number' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'not_interested', label: 'Not Interested' },
];

const LeadCard = ({ lead, onUpdate, onView, onSetReminder, isDragging }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const hasReminder = lead.reminder_date && !lead.reminder_completed;

    return (
        <div
            className={`kanban-card stage-${lead.stage} animate-fade-in ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}`}
            onClick={() => !isDragging && onView(lead)}
            data-testid={`lead-card-${lead.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {lead.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{lead.full_name}</p>
                        {lead.assigned_to_name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {lead.assigned_to_name}
                            </p>
                        )}
                    </div>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(lead); }}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetReminder(lead); }}>
                            <Bell className="h-4 w-4 mr-2" />
                            Set Reminder
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono flex-1">{lead.phone}</span>
                    <ClickToCall 
                        phoneNumber={lead.phone} 
                        contactId={lead.id} 
                        contactName={lead.full_name}
                        size="sm"
                        className="h-6 w-6"
                    />
                </div>
                {lead.email && (
                    <p className="flex items-center gap-2 text-muted-foreground truncate">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                    </p>
                )}
                {lead.country && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {lead.country}
                    </p>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(lead.created_at)}
                </span>
                <div className="flex items-center gap-1">
                    {hasReminder && (
                        <Badge className="bg-amber-500 text-white text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {lead.reminder_time || 'Set'}
                        </Badge>
                    )}
                    {lead.sla_breach && (
                        <Badge className="bg-red-500 text-white text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            SLA
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sortable wrapper for LeadCard
const SortableLeadCard = ({ lead, onUpdate, onView, onSetReminder }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <LeadCard
                lead={lead}
                onUpdate={onUpdate}
                onView={onView}
                onSetReminder={onSetReminder}
                isDragging={isDragging}
            />
        </div>
    );
};

const KanbanColumn = ({ stage, leads, onUpdate, onView, onSetReminder }) => {
    const stageLeads = leads.filter(l => l.stage === stage.id);
    
    return (
        <div className="kanban-column" data-testid={`kanban-column-${stage.id}`}>
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary">{stageLeads.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="space-y-3">
                    {stageLeads.map((lead) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onUpdate={onUpdate}
                            onView={onView}
                            onSetReminder={onSetReminder}
                        />
                    ))}
                    {stageLeads.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No leads in this stage
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

const SalesCRMPage = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderLead, setReminderLead] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '',
        country: '',
        city: '',
        lead_source: '',
        course_of_interest: '',
        notes: '',
    });
    const [updateData, setUpdateData] = useState({
        stage: '',
        call_notes: '',
        rejection_reason: '',
        follow_up_date: '',
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const response = await leadApi.getAll({ search: searchTerm || undefined });
            setLeads(response.data);
        } catch (error) {
            toast.error('Failed to fetch leads');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        // Debounce search
        setTimeout(() => fetchLeads(), 500);
    };

    const handleCreateLead = async (e) => {
        e.preventDefault();
        
        if (!formData.full_name || !formData.phone) {
            toast.error('Name and phone are required');
            return;
        }
        
        try {
            await leadApi.create(formData);
            toast.success('Lead created successfully');
            setShowCreateModal(false);
            setFormData({
                full_name: '',
                phone: '',
                email: '',
                country: '',
                city: '',
                lead_source: '',
                course_of_interest: '',
                notes: '',
            });
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create lead');
        }
    };

    const handleUpdateLead = async () => {
        if (!selectedLead) return;
        
        const updates = {};
        if (updateData.stage) updates.stage = updateData.stage;
        if (updateData.call_notes) updates.call_notes = updateData.call_notes;
        if (updateData.rejection_reason) updates.rejection_reason = updateData.rejection_reason;
        if (updateData.follow_up_date) updates.follow_up_date = updateData.follow_up_date;
        
        if (updates.stage === 'rejected' && !updates.rejection_reason) {
            toast.error('Please select a rejection reason');
            return;
        }
        
        try {
            await leadApi.update(selectedLead.id, updates);
            toast.success('Lead updated successfully');
            setShowDetailModal(false);
            setSelectedLead(null);
            setUpdateData({ stage: '', call_notes: '', rejection_reason: '', follow_up_date: '' });
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update lead');
        }
    };

    const handleViewLead = (lead) => {
        setSelectedLead(lead);
        setUpdateData({
            stage: lead.stage,
            call_notes: '',
            rejection_reason: lead.rejection_reason || '',
            follow_up_date: '',
        });
        setShowDetailModal(true);
    };

    const handleSetReminder = (lead) => {
        setReminderLead(lead);
        setShowReminderModal(true);
    };

    const handleReminderSuccess = () => {
        setShowReminderModal(false);
        setReminderLead(null);
        fetchLeads();
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
        <div className="space-y-6" data-testid="sales-crm-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales CRM</h1>
                    <p className="text-muted-foreground">Manage your leads and sales pipeline</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="pl-9 w-64"
                            data-testid="search-leads"
                        />
                    </div>
                    {['super_admin', 'admin', 'sales_manager', 'team_leader'].includes(user?.role) && (
                        <>
                            <ImportButton templateType="leads" title="Import Leads" onSuccess={fetchLeads} />
                            <Button onClick={() => setShowCreateModal(true)} data-testid="create-lead-btn">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Lead
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="kanban-board">
                    {LEAD_STAGES.map((stage) => (
                        <KanbanColumn
                            key={stage.id}
                            stage={stage}
                            leads={leads}
                            onUpdate={handleUpdateLead}
                            onView={handleViewLead}
                            onSetReminder={handleSetReminder}
                        />
                    ))}
                </div>
            )}

            {/* Create Lead Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Lead</DialogTitle>
                        <DialogDescription>
                            Add a new lead to the sales pipeline
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreateLead} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    data-testid="lead-name-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+971 50 000 0000"
                                    data-testid="lead-phone-input"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                data-testid="lead-email-input"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                                >
                                    <SelectTrigger data-testid="lead-country-select">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UAE">UAE</SelectItem>
                                        <SelectItem value="India">India</SelectItem>
                                        <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                                        <SelectItem value="Qatar">Qatar</SelectItem>
                                        <SelectItem value="Kuwait">Kuwait</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lead_source">Lead Source</Label>
                                <Select
                                    value={formData.lead_source}
                                    onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
                                >
                                    <SelectTrigger data-testid="lead-source-select">
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="meta_ads">Meta Ads</SelectItem>
                                        <SelectItem value="google_ads">Google Ads</SelectItem>
                                        <SelectItem value="website">Website</SelectItem>
                                        <SelectItem value="referral">Referral</SelectItem>
                                        <SelectItem value="manual">Manual Entry</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="course_of_interest">Course of Interest</Label>
                            <Select
                                value={formData.course_of_interest}
                                onValueChange={(value) => setFormData({ ...formData, course_of_interest: value })}
                            >
                                <SelectTrigger data-testid="lead-course-select">
                                    <SelectValue placeholder="Select course" />
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
                                rows={3}
                                data-testid="lead-notes-input"
                            />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" data-testid="submit-lead-btn">
                                Create Lead
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lead Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Lead Details</DialogTitle>
                        <DialogDescription>
                            View and update lead information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedLead && (
                        <div className="space-y-6">
                            {/* Lead Info */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                            {selectedLead.full_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold">{selectedLead.full_name}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    {selectedLead.phone}
                                                    <ClickToCall 
                                                        phoneNumber={selectedLead.phone} 
                                                        contactId={selectedLead.id} 
                                                        contactName={selectedLead.full_name}
                                                        variant="outline"
                                                        size="sm"
                                                        showLabel={true}
                                                        className="ml-2"
                                                    />
                                                </span>
                                                {selectedLead.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-4 w-4" />
                                                        {selectedLead.email}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Badge className={LEAD_STAGES.find(s => s.id === selectedLead.stage)?.color}>
                                                    {LEAD_STAGES.find(s => s.id === selectedLead.stage)?.label}
                                                </Badge>
                                                {selectedLead.sla_breach && (
                                                    <Badge className="bg-red-500">SLA Breach</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Country:</span>
                                            <span className="ml-2">{selectedLead.country || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Lead Source:</span>
                                            <span className="ml-2">{selectedLead.lead_source || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Course Interest:</span>
                                            <span className="ml-2">{selectedLead.course_of_interest || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Assigned To:</span>
                                            <span className="ml-2">{selectedLead.assigned_to_name || 'Unassigned'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Created:</span>
                                            <span className="ml-2">{formatDate(selectedLead.created_at)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Last Activity:</span>
                                            <span className="ml-2">{formatDate(selectedLead.last_activity)}</span>
                                        </div>
                                    </div>
                                    
                                    {/* 3CX Call History & Recording */}
                                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-muted-foreground/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PhoneCall className="h-4 w-4 text-primary" />
                                            <Label className="text-sm font-medium">3CX Call Center</Label>
                                            <Badge variant="outline" className="text-xs ml-auto bg-green-500/10 text-green-600 border-green-500/30">Connected</Badge>
                                        </div>
                                        
                                        {/* Call Recording Link */}
                                        {selectedLead.call_recording_url && (
                                            <div className="mb-3">
                                                <Label className="text-xs text-muted-foreground">Latest Recording</Label>
                                                <a 
                                                    href={selectedLead.call_recording_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                                                >
                                                    🎵 Play Recording
                                                </a>
                                            </div>
                                        )}
                                        
                                        {/* Call History */}
                                        <CallHistory contactId={selectedLead.id} />
                                    </div>
                                    
                                    {selectedLead.notes && (
                                        <div className="mt-4 p-3 bg-muted rounded-lg">
                                            <span className="text-muted-foreground text-sm">Notes:</span>
                                            <p className="mt-1">{selectedLead.notes}</p>
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
                                                <SelectContent>
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
                                                    <SelectContent>
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
                            
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdateLead} data-testid="update-lead-btn">
                                    Update Lead
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reminder Modal */}
            <ReminderModal
                open={showReminderModal}
                onClose={() => { setShowReminderModal(false); setReminderLead(null); }}
                entityType="lead"
                entityId={reminderLead?.id}
                entityName={reminderLead?.full_name}
                onSuccess={handleReminderSuccess}
            />
        </div>
    );
};

export default SalesCRMPage;
