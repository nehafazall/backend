import React, { useState, useEffect } from 'react';
import { useAuth, leadApi, apiClient } from '@/lib/api';
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
import EnrollmentPaymentModal from '@/components/EnrollmentPaymentModal';
import RejectionReasonModal from '@/components/RejectionReasonModal';
import { ClickToCall, CallHistory } from '@/components/ClickToCall';
import { COUNTRIES, LEAD_SOURCES, detectCountryFromPhone } from '@/lib/phoneCountry';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
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
    Target,
    GitMerge,
    Package,
    ShoppingCart,
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

const LeadCard = ({ lead, onUpdate, onView, onSetReminder, isDragging, isSuperAdmin, availableAgents, onQuickReassign }) => {
    const [showReassign, setShowReassign] = React.useState(false);
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return null;
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const hasReminder = lead.reminder_date && !lead.reminder_completed;
    const isPipelineStage = ['warm_lead', 'hot_lead', 'in_progress'].includes(lead.stage);

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
                            <div className="relative">
                                {isSuperAdmin ? (
                                    <button
                                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                        onClick={(e) => { e.stopPropagation(); setShowReassign(!showReassign); }}
                                        data-testid={`reassign-btn-${lead.id}`}
                                    >
                                        <User className="h-3 w-3" />
                                        {lead.assigned_to_name}
                                    </button>
                                ) : (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {lead.assigned_to_name}
                                    </p>
                                )}
                                {showReassign && isSuperAdmin && (
                                    <div className="absolute z-50 top-6 left-0 bg-popover border rounded-md shadow-lg p-1 min-w-[180px] max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                        {(availableAgents || []).map(agent => (
                                            <button
                                                key={agent.id}
                                                className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${agent.id === lead.assigned_to ? 'bg-accent font-medium' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); onQuickReassign(lead, agent); setShowReassign(false); }}
                                                data-testid={`reassign-agent-${agent.id}`}
                                            >
                                                {agent.full_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
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
            
            {/* Course Interest & Estimated Value - Show for pipeline stages */}
            {(lead.interested_course_name || lead.estimated_value) && (
                <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                    {lead.interested_course_name && (
                        <p className="text-xs font-medium text-primary truncate" title={lead.interested_course_name}>
                            {lead.interested_course_name}
                        </p>
                    )}
                    {lead.selected_addons?.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate" title={lead.selected_addons.map(a => a.name?.replace('Addons - ', '')).join(', ')}>
                            + {lead.selected_addons.map(a => a.name?.replace('Addons - ', '')).join(', ')}
                        </p>
                    )}
                    {lead.estimated_value > 0 && (
                        <p className="text-sm font-bold text-emerald-600 mt-0.5">
                            {formatCurrency(lead.estimated_value)}
                        </p>
                    )}
                </div>
            )}
            
            {/* Show sale amount for enrolled leads */}
            {lead.stage === 'enrolled' && lead.sale_amount > 0 && (
                <div className="mt-2 p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <p className="text-xs text-emerald-600">Enrolled</p>
                    <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(lead.sale_amount)}
                    </p>
                </div>
            )}
            
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
const SortableLeadCard = ({ lead, onUpdate, onView, onSetReminder, isSuperAdmin, availableAgents, onQuickReassign }) => {
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
                isSuperAdmin={isSuperAdmin}
                availableAgents={availableAgents}
                onQuickReassign={onQuickReassign}
            />
        </div>
    );
};

const KanbanColumn = ({ stage, leads, onUpdate, onView, onSetReminder, isSuperAdmin, availableAgents, onQuickReassign }) => {
    const stageLeads = leads.filter(l => l.stage === stage.id);
    const leadIds = stageLeads.map(l => l.id);
    
    // Make column a drop target
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });
    
    return (
        <div 
            ref={setNodeRef}
            className={`kanban-column ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
            data-testid={`kanban-column-${stage.id}`} 
            data-stage={stage.id}
        >
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary">{stageLeads.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1">
                <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[100px] p-1">
                        {stageLeads.map((lead) => (
                            <SortableLeadCard
                                key={lead.id}
                                lead={lead}
                                onUpdate={onUpdate}
                                onView={onView}
                                onSetReminder={onSetReminder}
                                isSuperAdmin={isSuperAdmin}
                                availableAgents={availableAgents}
                                onQuickReassign={onQuickReassign}
                            />
                        ))}
                        {stageLeads.length === 0 && (
                            <div className={`text-center text-muted-foreground py-8 text-sm border-2 border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                Drop leads here
                            </div>
                        )}
                    </div>
                </SortableContext>
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
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [pendingEnrollmentLead, setPendingEnrollmentLead] = useState(null);
    const [pendingRejectionLead, setPendingRejectionLead] = useState(null);
    const [reminderLead, setReminderLead] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '',
        country: '',
        city: '',
        lead_source: '',
        course_of_interest: '',
        notes: '',
        assigned_to: '',
    });
    const [updateData, setUpdateData] = useState({
        stage: '',
        call_notes: '',
        rejection_reason: '',
        follow_up_date: '',
        interested_course_id: '',
        estimated_value: '',
        selectedAddons: [],
    });
    const [courses, setCourses] = useState([]);
    const [catalogCourses, setCatalogCourses] = useState([]);
    const [catalogAddons, setCatalogAddons] = useState([]);
    const [duplicateInfo, setDuplicateInfo] = useState(null);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [merging, setMerging] = useState(false);
    const [availableAgents, setAvailableAgents] = useState([]);

    const isSuperAdmin = user?.role === 'super_admin';

    // Pipeline stages that require course selection
    const PIPELINE_STAGES = ['warm_lead', 'hot_lead', 'in_progress'];

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        fetchLeads();
    }, []);

    // Fetch agents for super admin direct assignment
    useEffect(() => {
        if (isSuperAdmin) {
            const fetchAgents = async () => {
                try {
                    const res = await apiClient.get('/users?role=sales_executive');
                    setAvailableAgents((res.data || []).filter(u => u.is_active));
                } catch (e) {
                    console.error('Failed to fetch agents:', e);
                }
            };
            fetchAgents();
        }
    }, [isSuperAdmin]);

    // Fetch course catalog for course/addon selection
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const res = await apiClient.get('/course-catalog');
                const grouped = res.data?.grouped || {};
                setCatalogCourses(grouped.courses || []);
                setCatalogAddons(grouped.addons || []);
                // Keep legacy courses for backward compat
                setCourses(res.data?.items || []);
            } catch (error) {
                console.error('Failed to fetch course catalog:', error);
                // Fallback to legacy courses endpoint
                try {
                    const res = await apiClient.get('/courses');
                    setCourses(res.data || []);
                } catch (e) {
                    console.error('Failed to fetch courses:', e);
                }
            }
        };
        fetchCatalog();
    }, []);

    // Auto-detect country when phone number changes
    const handlePhoneChange = (phone) => {
        setFormData(prev => {
            const detectedCountry = detectCountryFromPhone(phone);
            return {
                ...prev,
                phone,
                country: detectedCountry || prev.country,
            };
        });
    };

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

    // Drag and drop handlers
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeLeadId = active.id;
        const activeLead = leads.find(l => l.id === activeLeadId);
        
        if (!activeLead) return;

        // Determine target stage
        let targetStage = null;
        
        // Check if dropped over a column (stage id)
        const isColumnDrop = LEAD_STAGES.some(s => s.id === over.id);
        if (isColumnDrop) {
            targetStage = over.id;
        } else {
            // Dropped over another lead - get that lead's stage
            const overLead = leads.find(l => l.id === over.id);
            if (overLead) {
                targetStage = overLead.stage;
            }
        }

        // If dropped in a different stage, update the lead
        if (targetStage && targetStage !== activeLead.stage) {
            // Check if moving to enrolled - show payment modal
            if (targetStage === 'enrolled') {
                // Check if course is selected
                if (!activeLead.interested_course_id) {
                    toast.error('Please select a course of interest before enrolling');
                    return;
                }
                setPendingEnrollmentLead(activeLead);
                setShowEnrollmentModal(true);
                return;
            }
            
            // Check if moving to rejected - show rejection modal
            if (targetStage === 'rejected') {
                setPendingRejectionLead(activeLead);
                setShowRejectionModal(true);
                return;
            }
            
            try {
                await leadApi.update(activeLeadId, { stage: targetStage });
                toast.success(`Lead moved to ${LEAD_STAGES.find(s => s.id === targetStage)?.label}`);
                fetchLeads();
            } catch (error) {
                const detail = error.response?.data?.detail || 'Failed to move lead';
                if (detail.includes('course') || detail.includes('Course')) {
                    toast.error('Please open the lead details and select a course + add-ons first');
                } else {
                    toast.error(detail);
                }
                console.error(error);
            }
        }
    };

    // Handle enrollment with payment details
    const handleEnrollmentComplete = async (paymentData) => {
        if (!pendingEnrollmentLead) return;
        
        try {
            // Get course details
            const courseId = pendingEnrollmentLead.interested_course_id;
            const selectedCourse = catalogCourses.find(c => c.id === courseId) || courses.find(c => c.id === courseId);
            
            const updatePayload = {
                stage: 'enrolled',
                // Course info
                interested_course_id: courseId,
                interested_course_name: pendingEnrollmentLead.interested_course_name || selectedCourse?.name,
                course_id: courseId,
                course_name: pendingEnrollmentLead.interested_course_name || selectedCourse?.name,
                // Payment info
                payment_method: paymentData.payment_method,
                payment_amount: paymentData.payment_amount,
                payment_date: paymentData.payment_date,
                payment_proof: paymentData.payment_proof,
                payment_proof_filename: paymentData.payment_proof_filename,
                transaction_id: paymentData.transaction_id,
                payment_notes: paymentData.payment_notes,
                sale_amount: paymentData.payment_amount,
                // Split payment support
                is_split_payment: paymentData.is_split_payment,
                payment_splits: paymentData.payment_splits,
                // BNPL phone verification
                bnpl_phone: paymentData.bnpl_phone,
                bnpl_same_number: paymentData.bnpl_same_number,
            };
            
            await leadApi.update(pendingEnrollmentLead.id, updatePayload);
            toast.success('Lead enrolled successfully! Sent to Finance for verification.');
            setShowEnrollmentModal(false);
            setPendingEnrollmentLead(null);
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to enroll lead');
        }
    };

    // Handle rejection with reason
    const handleRejectionComplete = async (rejectionData) => {
        if (!pendingRejectionLead) return;
        
        try {
            await leadApi.update(pendingRejectionLead.id, {
                stage: 'rejected',
                rejection_reason: rejectionData.rejection_reason,
                rejection_reason_label: rejectionData.rejection_reason_label,
                rejection_notes: rejectionData.rejection_notes,
            });
            toast.success('Lead marked as rejected');
            setShowRejectionModal(false);
            setPendingRejectionLead(null);
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reject lead');
        }
    };

    const handleCreateLead = async (e) => {
        e.preventDefault();
        
        if (!formData.full_name || !formData.phone) {
            toast.error('Name and phone are required');
            return;
        }
        
        try {
            const payload = { ...formData };
            if (!payload.assigned_to || payload.assigned_to === 'round_robin') delete payload.assigned_to;
            await leadApi.create(payload);
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
                assigned_to: '',
            });
            fetchLeads();
        } catch (error) {
            if (error.response?.status === 409 && error.response?.data?.duplicate) {
                setDuplicateInfo(error.response.data);
                setShowCreateModal(false);
                setShowDuplicateDialog(true);
            } else {
                toast.error(error.response?.data?.detail || 'Failed to create lead');
            }
        }
    };

    const handleMerge = async () => {
        if (!duplicateInfo?.existing_lead?.id) return;
        setMerging(true);
        try {
            await apiClient.post(`/leads/${duplicateInfo.existing_lead.id}/merge`, formData);
            toast.success('Lead merged successfully — missing fields updated');
            setShowDuplicateDialog(false);
            setDuplicateInfo(null);
            setFormData({ full_name: '', phone: '', email: '', country: '', city: '', lead_source: '', course_of_interest: '', notes: '', assigned_to: '' });
            fetchLeads();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Merge failed');
        }
        setMerging(false);
    };

    const handleUpdateLead = async () => {
        if (!selectedLead) return;
        
        const updates = {};
        if (updateData.stage) updates.stage = updateData.stage;
        if (updateData.call_notes) updates.call_notes = updateData.call_notes;
        if (updateData.rejection_reason) updates.rejection_reason = updateData.rejection_reason;
        if (updateData.follow_up_date) updates.follow_up_date = updateData.follow_up_date;
        
        // Add course interest for pipeline stages
        if (updateData.interested_course_id) {
            updates.interested_course_id = updateData.interested_course_id;
            const selectedCourse = catalogCourses.find(c => c.id === updateData.interested_course_id)
                || courses.find(c => c.id === updateData.interested_course_id);
            if (selectedCourse) {
                updates.interested_course_name = selectedCourse.name;
                const coursePrice = selectedCourse.price || selectedCourse.base_price || 0;
                const addonsPrice = (updateData.selectedAddons || []).reduce((sum, a) => sum + (a.price || 0), 0);
                updates.course_value = coursePrice;
                updates.addons_value = addonsPrice;
                if (!updateData.estimated_value) {
                    updates.estimated_value = coursePrice + addonsPrice;
                }
            }
        }
        if (updateData.selectedAddons?.length > 0) {
            updates.selected_addons = updateData.selectedAddons;
        }
        if (updateData.estimated_value) {
            updates.estimated_value = parseFloat(updateData.estimated_value);
        }
        
        // Check if changing to enrolled - show payment modal
        if (updates.stage === 'enrolled' && selectedLead.stage !== 'enrolled') {
            const courseId = updates.interested_course_id || selectedLead.interested_course_id;
            if (!courseId) {
                toast.error('Please select a course of interest before enrolling');
                return;
            }
            setShowDetailModal(false);
            setPendingEnrollmentLead({...selectedLead, ...updates});
            setShowEnrollmentModal(true);
            return;
        }
        
        // Check if changing to rejected - show rejection modal
        if (updates.stage === 'rejected' && selectedLead.stage !== 'rejected') {
            setShowDetailModal(false);
            setPendingRejectionLead(selectedLead);
            setShowRejectionModal(true);
            return;
        }
        
        // Validate course selection for pipeline stages
        if (PIPELINE_STAGES.includes(updates.stage)) {
            const courseId = updates.interested_course_id || selectedLead.interested_course_id;
            if (!courseId) {
                toast.error('Please select which course/package the client is interested in');
                return;
            }
        }
        
        try {
            await leadApi.update(selectedLead.id, updates);
            toast.success('Lead updated successfully');
            setShowDetailModal(false);
            setSelectedLead(null);
            setUpdateData({ stage: '', call_notes: '', rejection_reason: '', follow_up_date: '', interested_course_id: '', estimated_value: '', selectedAddons: [] });
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
            interested_course_id: lead.interested_course_id || '',
            estimated_value: lead.estimated_value || '',
            selectedAddons: lead.selected_addons || [],
        });
        setShowDetailModal(true);
    };

    const handleSetReminder = (lead) => {
        setReminderLead(lead);
        setShowReminderModal(true);
    };

    const handleQuickReassign = async (lead, agent) => {
        try {
            await apiClient.put(`/leads/${lead.id}`, {
                assigned_to: agent.id,
                assigned_to_name: agent.full_name,
            });
            toast.success(`Reassigned to ${agent.full_name}`);
            fetchLeads();
        } catch (e) {
            console.error(e);
            toast.error('Failed to reassign');
        }
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
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="kanban-board">
                        {LEAD_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                leads={leads}
                                onUpdate={handleUpdateLead}
                                onView={handleViewLead}
                                onSetReminder={handleSetReminder}
                                isSuperAdmin={isSuperAdmin}
                                availableAgents={availableAgents}
                                onQuickReassign={handleQuickReassign}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <div className="opacity-80">
                                <LeadCard
                                    lead={leads.find(l => l.id === activeId)}
                                    onUpdate={() => {}}
                                    onView={() => {}}
                                    onSetReminder={() => {}}
                                    isDragging={true}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
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
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder="+971 50 000 0000"
                                    data-testid="lead-phone-input"
                                />
                                {formData.country && formData.phone && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Auto-detected: {formData.country}
                                    </p>
                                )}
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
                                    <SelectContent className="max-h-60">
                                        {COUNTRIES.map((country) => (
                                            <SelectItem key={country} value={country}>
                                                {country}
                                            </SelectItem>
                                        ))}
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
                                        {LEAD_SOURCES.map((source) => (
                                            <SelectItem key={source.id} value={source.id}>
                                                {source.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {isSuperAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assign to Agent (Optional)</Label>
                                <Select
                                    value={formData.assigned_to}
                                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                                >
                                    <SelectTrigger data-testid="lead-assign-agent-select">
                                        <SelectValue placeholder="Auto (Round Robin)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="round_robin">Auto (Round Robin)</SelectItem>
                                        {availableAgents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.full_name} {agent.team_name ? `(${agent.team_name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Leave as Auto to use round-robin assignment</p>
                            </div>
                        )}

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
                                    
                                    {/* Course & Add-ons Selection - Required for pipeline stages */}
                                    {PIPELINE_STAGES.includes(updateData.stage) && (
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-4">
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <Target className="h-4 w-4" />
                                                <span className="text-sm font-medium">Course & Add-ons Selection</span>
                                            </div>
                                            
                                            {/* Course Selection */}
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1.5">
                                                    <Package className="h-3.5 w-3.5" />
                                                    Select Course *
                                                </Label>
                                                <Select
                                                    value={updateData.interested_course_id}
                                                    onValueChange={(value) => {
                                                        const course = catalogCourses.find(c => c.id === value);
                                                        const coursePrice = course?.price || 0;
                                                        const addonsPrice = (updateData.selectedAddons || []).reduce((sum, a) => sum + (a.price || 0), 0);
                                                        setUpdateData({ 
                                                            ...updateData, 
                                                            interested_course_id: value,
                                                            estimated_value: coursePrice + addonsPrice
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger data-testid="course-interest-select">
                                                        <SelectValue placeholder="Select course" />
                                                    </SelectTrigger>
                                                    <SelectContent position="popper" className="z-[9999]">
                                                        {catalogCourses.map((course) => (
                                                            <SelectItem key={course.id} value={course.id}>
                                                                {course.name} - AED {course.price?.toLocaleString()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {/* Add-ons Selection (Multi-select checkboxes) */}
                                            {catalogAddons.length > 0 && (
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-1.5">
                                                        <ShoppingCart className="h-3.5 w-3.5" />
                                                        Select Add-ons (Optional)
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-2 p-3 bg-background rounded-md border border-border">
                                                        {catalogAddons.map((addon) => {
                                                            const isSelected = (updateData.selectedAddons || []).some(a => a.id === addon.id);
                                                            return (
                                                                <label
                                                                    key={addon.id}
                                                                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${
                                                                        isSelected 
                                                                            ? 'bg-primary/10 border border-primary/30' 
                                                                            : 'hover:bg-muted/50 border border-transparent'
                                                                    }`}
                                                                    data-testid={`addon-checkbox-${addon.id}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            let newAddons;
                                                                            if (e.target.checked) {
                                                                                newAddons = [...(updateData.selectedAddons || []), { id: addon.id, name: addon.name, price: addon.price }];
                                                                            } else {
                                                                                newAddons = (updateData.selectedAddons || []).filter(a => a.id !== addon.id);
                                                                            }
                                                                            const coursePrice = catalogCourses.find(c => c.id === updateData.interested_course_id)?.price || 0;
                                                                            const addonsPrice = newAddons.reduce((sum, a) => sum + (a.price || 0), 0);
                                                                            setUpdateData({
                                                                                ...updateData,
                                                                                selectedAddons: newAddons,
                                                                                estimated_value: coursePrice + addonsPrice
                                                                            });
                                                                        }}
                                                                        className="rounded border-gray-400 text-primary focus:ring-primary h-4 w-4"
                                                                    />
                                                                    <span className="flex-1 truncate">{addon.name.replace('Addons - ', '')}</span>
                                                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">AED {addon.price}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Price Breakdown */}
                                            {updateData.interested_course_id && (
                                                <div className="p-3 bg-background rounded-md border border-border space-y-1.5" data-testid="price-breakdown">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Course</span>
                                                        <span>AED {(catalogCourses.find(c => c.id === updateData.interested_course_id)?.price || 0).toLocaleString()}</span>
                                                    </div>
                                                    {(updateData.selectedAddons || []).length > 0 && (
                                                        <>
                                                            {(updateData.selectedAddons || []).map((a) => (
                                                                <div key={a.id} className="flex justify-between text-sm">
                                                                    <span className="text-muted-foreground">{a.name.replace('Addons - ', '')}</span>
                                                                    <span>AED {a.price?.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                    <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
                                                        <span>Estimated Total</span>
                                                        <span className="text-primary">AED {(updateData.estimated_value || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {selectedLead?.interested_course_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    Currently interested in: <span className="font-medium">{selectedLead.interested_course_name}</span>
                                                    {selectedLead?.selected_addons?.length > 0 && (
                                                        <span> + {selectedLead.selected_addons.map(a => a.name?.replace('Addons - ', '')).join(', ')}</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
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

            {/* Enrollment Payment Modal */}
            <EnrollmentPaymentModal
                open={showEnrollmentModal}
                onClose={() => { setShowEnrollmentModal(false); setPendingEnrollmentLead(null); }}
                lead={pendingEnrollmentLead}
                course={catalogCourses.find(c => c.id === pendingEnrollmentLead?.interested_course_id) || courses.find(c => c.id === pendingEnrollmentLead?.interested_course_id)}
                onComplete={handleEnrollmentComplete}
            />

            {/* Rejection Reason Modal */}
            <RejectionReasonModal
                open={showRejectionModal}
                onClose={() => { setShowRejectionModal(false); setPendingRejectionLead(null); }}
                lead={pendingRejectionLead}
                onComplete={handleRejectionComplete}
            />

            {/* Duplicate Lead Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="max-w-lg" data-testid="duplicate-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="h-5 w-5" />
                            Duplicate Lead Found
                        </DialogTitle>
                    </DialogHeader>
                    {duplicateInfo?.existing_lead && (() => {
                        const el = duplicateInfo.existing_lead;
                        return (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    A lead with the same <strong>{duplicateInfo.matched_on}</strong> already exists in the system.
                                </p>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{el.full_name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{el.phone || 'N/A'}</div>
                                        <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{el.email || 'N/A'}</div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <Badge variant="outline" className="capitalize">{el.stage?.replace(/_/g, ' ')}</Badge>
                                        <span>Assigned to: {el.assigned_to_name || 'Unassigned'}</span>
                                    </div>
                                    {el.source && <p className="text-xs text-muted-foreground">Source: {el.source}</p>}
                                </div>
                                <p className="text-sm">Would you like to <strong>merge</strong> the new data into the existing lead? Only missing fields will be updated.</p>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => { setShowDuplicateDialog(false); setShowCreateModal(true); }} data-testid="duplicate-cancel-btn">
                                        Go Back
                                    </Button>
                                    <Button onClick={handleMerge} disabled={merging} className="bg-amber-600 hover:bg-amber-700" data-testid="duplicate-merge-btn">
                                        <GitMerge className="h-4 w-4 mr-2" />{merging ? 'Merging...' : 'Merge Lead'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesCRMPage;
