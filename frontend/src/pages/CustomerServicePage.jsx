import React, { useState, useEffect } from 'react';
import { useAuth, studentApi, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import ImportButton from '@/components/ImportButton';
import ReminderModal from '@/components/ReminderModal';
import ActivationQuestionnaireModal from '@/components/ActivationQuestionnaireModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ClickToCall, CallHistory } from '@/components/ClickToCall';
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
import UpgradePricingModal from '@/components/UpgradePricingModal';
import UpgradeConfirmPaymentModal from '@/components/UpgradeConfirmPaymentModal';
import { getCourseColor, UpgradeHistoryCard, UpgradePathIndicator } from '@/components/UpgradeModal';
import {
    Search,
    Phone,
    Mail,
    User,
    GraduationCap,
    CheckCircle,
    Clock,
    TrendingUp,
    MoreVertical,
    Bell,
    PhoneCall,
    GripVertical,
    ArrowUp,
} from 'lucide-react';

const CS_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500', icon: User },
    { id: 'activated', label: 'Activated', color: 'bg-emerald-500', icon: CheckCircle },
    { id: 'satisfactory_call', label: 'Satisfactory Call', color: 'bg-purple-500', icon: Phone },
    { id: 'pitched_for_upgrade', label: 'Pitched Upgrade', color: 'bg-orange-500', icon: TrendingUp },
    { id: 'in_progress', label: 'In Progress', color: 'bg-cyan-500', icon: Clock },
    { id: 'interested', label: 'Interested', color: 'bg-yellow-500', icon: CheckCircle },
    { id: 'upgraded', label: 'Upgraded', color: 'bg-emerald-600', icon: ArrowUp },
    { id: 'not_interested', label: 'Not Interested', color: 'bg-rose-500', icon: User },
];

const StudentCard = ({ student, onView, onSetReminder, onInitiateUpgrade, isDragging }) => {
    const hasReminder = student.reminder_date && !student.reminder_completed;
    const isUpgradedStudent = student.is_upgraded_student;
    const courseName = student.current_course_name || student.package_bought;
    const courseColors = getCourseColor(courseName);

    return (
        <div
            className={`kanban-card stage-${student.stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''} ${isUpgradedStudent ? `${courseColors.bg} ${courseColors.border} border-2` : ''}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`student-card-${student.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className={`w-8 h-8 rounded-full ${isUpgradedStudent ? courseColors.bg + ' ' + courseColors.text : 'bg-emerald-600 text-white'} flex items-center justify-center text-sm font-medium`}>
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{student.full_name}</p>
                            {isUpgradedStudent && (
                                <Badge className="bg-emerald-500 text-white text-[10px] px-1 py-0">
                                    <ArrowUp className="h-2 w-2 mr-0.5" />
                                    x{student.upgrade_count || 1}
                                </Badge>
                            )}
                        </div>
                        {student.cs_agent_name && (
                            <p className="text-xs text-muted-foreground">
                                Agent: {student.cs_agent_name}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(student); }}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetReminder(student); }}>
                            <Bell className="h-4 w-4 mr-2" />
                            Set Reminder
                        </DropdownMenuItem>
                        {student.stage === 'activated' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); onInitiateUpgrade(student); }}
                                    className="text-emerald-600"
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Initiate Upgrade
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono flex-1">{student.phone}</span>
                    <ClickToCall 
                        phoneNumber={student.phone} 
                        contactId={student.id} 
                        contactName={student.full_name}
                        size="sm"
                        className="h-6 w-6"
                    />
                </div>
                {student.student_code && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        <span className="font-mono text-xs" data-testid={`student-code-${student.id}`}>ID: {student.student_code}</span>
                    </div>
                )}
                {courseName && (
                    <p className="flex items-center gap-2">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <Badge className={`${courseColors.bg} ${courseColors.text} text-xs`}>
                            {courseName}
                        </Badge>
                    </p>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                    {student.onboarding_complete && (
                        <Badge className="bg-emerald-500 text-white text-xs">Onboarded</Badge>
                    )}
                    {student.upgrade_eligible && !isUpgradedStudent && (
                        <Badge className="bg-yellow-500 text-white text-xs">Upgrade Ready</Badge>
                    )}
                    {hasReminder && (
                        <Badge className="bg-amber-500 text-white text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {student.reminder_time || 'Set'}
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-muted-foreground">
                    {student.classes_attended} classes
                </span>
            </div>
        </div>
    );
};

// Sortable wrapper for StudentCard
const SortableStudentCard = ({ student, onView, onSetReminder, onInitiateUpgrade }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: student.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <StudentCard
                student={student}
                onView={onView}
                onSetReminder={onSetReminder}
                onInitiateUpgrade={onInitiateUpgrade}
                isDragging={isDragging}
            />
        </div>
    );
};

const KanbanColumn = ({ stage, students, onView, onSetReminder, onInitiateUpgrade }) => {
    const stageStudents = students.filter(s => s.stage === stage.id);
    const studentIds = stageStudents.map(s => s.id);
    const StageIcon = stage.icon;
    
    // Make column a drop target
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });
    
    return (
        <div 
            ref={setNodeRef}
            className={`kanban-column ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
            data-testid={`cs-column-${stage.id}`}
        >
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <StageIcon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary">{stageStudents.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1">
                <SortableContext items={studentIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[100px] p-1">
                        {stageStudents.map((student) => (
                            <SortableStudentCard
                                key={student.id}
                                student={student}
                                onView={onView}
                                onSetReminder={onSetReminder}
                                onInitiateUpgrade={onInitiateUpgrade}
                            />
                        ))}
                        {stageStudents.length === 0 && (
                            <div className={`text-center text-muted-foreground py-8 text-sm border-2 border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                Drop students here
                            </div>
                        )}
                    </div>
                </SortableContext>
            </ScrollArea>
        </div>
    );
};

const CustomerServicePage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showActivationModal, setShowActivationModal] = useState(false);
    const [pendingActivationStudent, setPendingActivationStudent] = useState(null);
    const [reminderStudent, setReminderStudent] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [updateData, setUpdateData] = useState({
        stage: '',
        notes: '',
        onboarding_complete: false,
        classes_attended: 0,
    });
    
    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeStudent, setUpgradeStudent] = useState(null);
    // Upgrade pricing modal (pitched_for_upgrade)
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingStudent, setPricingStudent] = useState(null);
    // Upgrade confirm + payment modal (upgraded)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmStudent, setConfirmStudent] = useState(null);

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
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await studentApi.getAll({ search: searchTerm || undefined });
            setStudents(response.data);
        } catch (error) {
            toast.error('Failed to fetch students');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setTimeout(() => fetchStudents(), 500);
    };

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setUpdateData({
            stage: student.stage,
            notes: '',
            onboarding_complete: student.onboarding_complete || false,
            classes_attended: student.classes_attended || 0,
        });
        setShowDetailModal(true);
    };

    const handleSetReminder = (student) => {
        setReminderStudent(student);
        setShowReminderModal(true);
    };

    const handleReminderSuccess = () => {
        setShowReminderModal(false);
        setReminderStudent(null);
        fetchStudents();
    };

    // Initiate upgrade flow for a student
    const handleInitiateUpgrade = (student) => {
        setUpgradeStudent(student);
        setShowUpgradeModal(true);
    };

    // When upgrade is completed
    const handleUpgradeComplete = (updatedStudent) => {
        setShowUpgradeModal(false);
        setUpgradeStudent(null);
        fetchStudents();
        toast.success(`Upgrade initiated for ${updatedStudent.full_name}`);
    };

    // Drag and drop handlers
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeStudentId = active.id;
        const activeStudent = students.find(s => s.id === activeStudentId);
        
        if (!activeStudent) return;

        // Determine target stage
        let targetStage = null;
        
        // Check if dropped over a column (stage id)
        const isColumnDrop = CS_STAGES.some(s => s.id === over.id);
        if (isColumnDrop) {
            targetStage = over.id;
        } else {
            // Dropped over another student - get that student's stage
            const overStudent = students.find(s => s.id === over.id);
            if (overStudent) {
                targetStage = overStudent.stage;
            }
        }

        // If dropped in a different stage, update the student
        if (targetStage && targetStage !== activeStudent.stage) {
            // Check if moving to "activated" stage - show questionnaire
            if (targetStage === 'activated' && (activeStudent.stage === 'new_student')) {
                setPendingActivationStudent(activeStudent);
                setShowActivationModal(true);
                return;
            }

            // Check if moving to "pitched_for_upgrade" - show pricing modal
            if (targetStage === 'pitched_for_upgrade') {
                setPricingStudent(activeStudent);
                setShowPricingModal(true);
                return;
            }

            // Check if moving to "upgraded" - show confirm + payment modal
            if (targetStage === 'upgraded') {
                if (!activeStudent.pitched_upgrade_path) {
                    toast.error('Student must be pitched first before upgrading');
                    return;
                }
                setConfirmStudent(activeStudent);
                setShowConfirmModal(true);
                return;
            }
            
            try {
                await studentApi.update(activeStudentId, { stage: targetStage });
                toast.success(`Student moved to ${CS_STAGES.find(s => s.id === targetStage)?.label}`);
                fetchStudents();
            } catch (error) {
                toast.error('Failed to move student');
                console.error(error);
            }
        }
    };

    // Handle activation questionnaire completion
    const handleActivationComplete = async (questionnaireData) => {
        if (!pendingActivationStudent) return;
        
        try {
            await studentApi.update(pendingActivationStudent.id, { 
                stage: 'activated',
                activation_questionnaire: questionnaireData,
                onboarding_complete: true,
                activated_at: new Date().toISOString(),
                activated_by: user?.id,
            });
            toast.success('Student activated successfully!');
            setShowActivationModal(false);
            setPendingActivationStudent(null);
            fetchStudents();
        } catch (error) {
            toast.error('Failed to activate student');
            console.error(error);
        }
    };

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        
        // Check if changing to "activated" stage from "new_student"
        if (updateData.stage === 'activated' && selectedStudent.stage === 'new_student') {
            setShowDetailModal(false);
            setPendingActivationStudent(selectedStudent);
            setShowActivationModal(true);
            return;
        }

        // Check if changing to "pitched_for_upgrade" - show pricing modal
        if (updateData.stage === 'pitched_for_upgrade' && selectedStudent.stage !== 'pitched_for_upgrade') {
            setShowDetailModal(false);
            setPricingStudent(selectedStudent);
            setShowPricingModal(true);
            return;
        }

        // Check if changing to "upgraded" - show confirm + payment modal
        if (updateData.stage === 'upgraded' && selectedStudent.stage !== 'upgraded') {
            if (!selectedStudent.pitched_upgrade_path) {
                toast.error('Student must be pitched first before upgrading');
                return;
            }
            setShowDetailModal(false);
            setConfirmStudent(selectedStudent);
            setShowConfirmModal(true);
            return;
        }
        
        try {
            await studentApi.update(selectedStudent.id, updateData);
            toast.success('Student updated successfully');
            setShowDetailModal(false);
            fetchStudents();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update student');
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

    return (
        <div className="space-y-6" data-testid="cs-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Service</h1>
                    <p className="text-muted-foreground">Manage student onboarding and support</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="pl-9 w-64"
                            data-testid="search-students"
                        />
                    </div>
                    {['super_admin', 'admin', 'cs_head'].includes(user?.role) && (
                        <>
                            <ImportButton templateType="students_cs" title="Import Students" onSuccess={fetchStudents} />
                            <ImportButton templateType="cs_upgrades" title="Import Upgrades" onSuccess={fetchStudents} />
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
                        {CS_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                students={students}
                                onView={handleViewStudent}
                                onSetReminder={handleSetReminder}
                                onInitiateUpgrade={handleInitiateUpgrade}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <StudentCard
                                student={students.find(s => s.id === activeId)}
                                onView={() => {}}
                                onSetReminder={() => {}}
                                onInitiateUpgrade={() => {}}
                                isDragging={true}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Student Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Student Details</DialogTitle>
                        <DialogDescription>
                            View and update student information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedStudent && (
                        <div className="space-y-6">
                            {/* Student Info */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                                            {selectedStudent.full_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold">{selectedStudent.full_name}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-4 w-4" />
                                                    {selectedStudent.phone}
                                                    <ClickToCall 
                                                        phoneNumber={selectedStudent.phone} 
                                                        contactId={selectedStudent.id} 
                                                        contactName={selectedStudent.full_name}
                                                        variant="outline"
                                                        size="sm"
                                                        showLabel={true}
                                                        className="ml-2"
                                                    />
                                                </span>
                                                {selectedStudent.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-4 w-4" />
                                                        {selectedStudent.email}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <Badge className={CS_STAGES.find(s => s.id === selectedStudent.stage)?.color}>
                                                    {CS_STAGES.find(s => s.id === selectedStudent.stage)?.label}
                                                </Badge>
                                                {selectedStudent.onboarding_complete && (
                                                    <Badge className="bg-emerald-500">Onboarded</Badge>
                                                )}
                                                {selectedStudent.upgrade_eligible && (
                                                    <Badge className="bg-yellow-500">Upgrade Eligible</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Package:</span>
                                            <span className="ml-2">{selectedStudent.package_bought || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Country:</span>
                                            <span className="ml-2">{selectedStudent.country || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Classes Attended:</span>
                                            <span className="ml-2 font-mono">{selectedStudent.classes_attended || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">CS Agent:</span>
                                            <span className="ml-2">{selectedStudent.cs_agent_name || 'Unassigned'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Mentor:</span>
                                            <span className="ml-2">{selectedStudent.mentor_name || 'Not Assigned'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Enrolled:</span>
                                            <span className="ml-2">{formatDate(selectedStudent.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Student Code / External ID */}
                                    <div className="mt-4 flex items-center gap-3">
                                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Student ID:</Label>
                                        <Input
                                            value={selectedStudent.student_code || ''}
                                            placeholder="Enter external student code"
                                            className="h-8 text-sm font-mono max-w-[200px]"
                                            data-testid="student-code-input"
                                            onChange={async (e) => {
                                                const code = e.target.value;
                                                setSelectedStudent(prev => ({ ...prev, student_code: code }));
                                            }}
                                            onBlur={async (e) => {
                                                const code = e.target.value;
                                                try {
                                                    await apiClient.patch(`/students/${selectedStudent.id}/student-code`, { student_code: code });
                                                } catch { /* silent */ }
                                            }}
                                        />
                                    </div>
                                    
                                    {/* 3CX Call Center Integration */}
                                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-muted-foreground/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PhoneCall className="h-4 w-4 text-primary" />
                                            <Label className="text-sm font-medium">3CX Call Center</Label>
                                            <Badge variant="outline" className="text-xs ml-auto bg-green-500/10 text-green-600 border-green-500/30">Connected</Badge>
                                        </div>
                                        
                                        {/* Call Recording Link */}
                                        {selectedStudent.call_recording_url && (
                                            <div className="mb-3">
                                                <Label className="text-xs text-muted-foreground">Latest Recording</Label>
                                                <a 
                                                    href={selectedStudent.call_recording_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                                                >
                                                    🎵 Play Recording
                                                </a>
                                            </div>
                                        )}
                                        
                                        {/* Call History */}
                                        <CallHistory contactId={selectedStudent.id} />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Upgrade Journey Path */}
                            {(selectedStudent.upgrade_history?.length > 0 || selectedStudent.current_course_name || selectedStudent.is_upgraded_student) && (
                                <UpgradePathIndicator
                                    currentCourse={selectedStudent.current_course_name || selectedStudent.package_bought}
                                    upgradeHistory={selectedStudent.upgrade_history || []}
                                    showHistory={true}
                                />
                            )}
                            
                            {/* Update Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Update Student</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Move to Stage</Label>
                                            <Select
                                                value={updateData.stage}
                                                onValueChange={(value) => setUpdateData({ ...updateData, stage: value })}
                                            >
                                                <SelectTrigger data-testid="cs-stage-select">
                                                    <SelectValue placeholder="Select stage" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CS_STAGES.map((stage) => (
                                                        <SelectItem key={stage.id} value={stage.id}>
                                                            {stage.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Classes Attended</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={updateData.classes_attended}
                                                onChange={(e) => setUpdateData({ ...updateData, classes_attended: parseInt(e.target.value) || 0 })}
                                                data-testid="classes-input"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="onboarding"
                                            checked={updateData.onboarding_complete}
                                            onCheckedChange={(checked) => setUpdateData({ ...updateData, onboarding_complete: checked })}
                                            data-testid="onboarding-checkbox"
                                        />
                                        <Label htmlFor="onboarding">Onboarding Complete</Label>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Notes</Label>
                                        <Textarea
                                            value={updateData.notes}
                                            onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                                            placeholder="Add notes..."
                                            rows={3}
                                            data-testid="cs-notes-input"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdateStudent} data-testid="update-student-btn">
                                    Update Student
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reminder Modal */}
            <ReminderModal
                open={showReminderModal}
                onClose={() => { setShowReminderModal(false); setReminderStudent(null); }}
                entityType="student"
                entityId={reminderStudent?.id}
                entityName={reminderStudent?.full_name}
                onSuccess={handleReminderSuccess}
            />

            {/* Activation Questionnaire Modal */}
            <ActivationQuestionnaireModal
                open={showActivationModal}
                onClose={() => { setShowActivationModal(false); setPendingActivationStudent(null); }}
                student={pendingActivationStudent}
                onComplete={handleActivationComplete}
            />

            {/* Upgrade Pricing Modal (pitched_for_upgrade) */}
            <UpgradePricingModal
                open={showPricingModal}
                onClose={() => { setShowPricingModal(false); setPricingStudent(null); }}
                student={pricingStudent}
                onPitchComplete={(updatedStudent) => {
                    setShowPricingModal(false);
                    setPricingStudent(null);
                    fetchStudents();
                    toast.success(`Upgrade pitched for ${updatedStudent.full_name}`);
                }}
            />

            {/* Upgrade Confirm + Payment Modal (upgraded) */}
            <UpgradeConfirmPaymentModal
                open={showConfirmModal}
                onClose={() => { setShowConfirmModal(false); setConfirmStudent(null); }}
                student={confirmStudent}
                onConfirmComplete={(updatedStudent) => {
                    setShowConfirmModal(false);
                    setConfirmStudent(null);
                    fetchStudents();
                    toast.success(`Upgrade confirmed for ${updatedStudent.full_name}. Student moved to New Student — please re-activate.`, { duration: 6000 });
                }}
            />
        </div>
    );
};

export default CustomerServicePage;
