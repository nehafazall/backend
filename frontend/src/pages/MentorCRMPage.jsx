import React, { useState, useEffect } from 'react';
import { useAuth, studentApi, apiClient } from '@/lib/api';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ImportButton from '@/components/ImportButton';
import ReminderModal from '@/components/ReminderModal';
import { getCourseColor, COURSE_COLORS } from '@/components/UpgradeModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
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
import {
    Search,
    Phone,
    Mail,
    User,
    GraduationCap,
    MessageSquare,
    TrendingUp,
    CheckCircle,
    DollarSign,
    MoreVertical,
    Bell,
    PhoneCall,
    GripVertical,
    RefreshCw,
} from 'lucide-react';

const MENTOR_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500', icon: User },
    { id: 'discussion_started', label: 'Discussion Started', color: 'bg-purple-500', icon: MessageSquare },
    { id: 'pitched_for_redeposit', label: 'Pitched Redeposit', color: 'bg-orange-500', icon: TrendingUp },
    { id: 'interested', label: 'Interested', color: 'bg-yellow-500', icon: CheckCircle },
    { id: 'closed', label: 'Closed (Deposit)', color: 'bg-emerald-500', icon: DollarSign },
];

const StudentCard = ({ student, onView, onSetReminder, isDragging, isSuperAdmin, mentorAgents, onReassign }) => {
    const hasReminder = student.reminder_date && !student.reminder_completed;
    const courseLevel = student.course_level || '';
    const courseName = courseLevel || student.current_course_name || student.package_bought;
    const courseColors = getCourseColor(courseName);
    const hasCourse = !!courseName;

    return (
        <div
            className={`kanban-card stage-${student.mentor_stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''} ${hasCourse ? `${courseColors.border} border-l-4` : ''}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`mentor-card-${student.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className={`w-8 h-8 rounded-full ${hasCourse ? courseColors.bg + ' ' + courseColors.text : 'bg-orange-600 text-white'} flex items-center justify-center text-sm font-medium`}>
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
                        {hasCourse ? (
                            <Badge className={`${courseColors.bg} ${courseColors.text} ${courseColors.border} border text-[10px] px-1.5 py-0`}>
                                {courseColors.label}
                            </Badge>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {student.trading_level || 'Beginner'}
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
                        {isSuperAdmin && mentorAgents && mentorAgents.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Reassign to:</DropdownMenuLabel>
                                {mentorAgents.filter(m => m.id !== student.mentor_id).map(m => (
                                    <DropdownMenuItem 
                                        key={m.id}
                                        onClick={(e) => { e.stopPropagation(); onReassign(student.id, m.id); }}
                                        data-testid={`reassign-${student.id}-to-${m.id}`}
                                    >
                                        <RefreshCw className="h-3 w-3 mr-2" />
                                        {m.full_name}
                                    </DropdownMenuItem>
                                ))}
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
                {student.preferred_language && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {student.preferred_language}
                    </p>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {student.classes_attended || 0} classes
                    </span>
                    {hasReminder && (
                        <Badge className="bg-amber-500 text-white text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {student.reminder_type || student.reminder_time || 'Set'}
                        </Badge>
                    )}
                </div>
                {student.mentor_name && (
                    <Badge variant="outline" className="text-xs">
                        {student.mentor_name}
                    </Badge>
                )}
            </div>
        </div>
    );
};

// Sortable wrapper for StudentCard
const SortableStudentCard = ({ student, onView, onSetReminder, isSuperAdmin, mentorAgents, onReassign }) => {
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
                isDragging={isDragging}
                isSuperAdmin={isSuperAdmin}
                mentorAgents={mentorAgents}
                onReassign={onReassign}
            />
        </div>
    );
};

const KanbanColumn = ({ stage, students, onView, onSetReminder, onHeaderClick, headerExtra, isSuperAdmin, mentorAgents, onReassign }) => {
    const stageStudents = students.filter(s => s.mentor_stage === stage.id);
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
            data-testid={`mentor-column-${stage.id}`}
        >
            <div className={`kanban-column-header ${onHeaderClick ? 'cursor-pointer hover:bg-muted/50 rounded-lg transition-colors' : ''}`} onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (onHeaderClick) onHeaderClick(); }}>
                <div className="flex items-center gap-2">
                    <StageIcon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {headerExtra}
                    <Badge variant="secondary">{stageStudents.length}</Badge>
                </div>
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
                                isSuperAdmin={isSuperAdmin}
                                mentorAgents={mentorAgents}
                                onReassign={onReassign}
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

const MentorCRMPage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('my_work'); // 'my_work' | 'team'
    const [teamMentors, setTeamMentors] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderStudent, setReminderStudent] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [updateData, setUpdateData] = useState({
        mentor_stage: '',
        notes: '',
    });
    const [redepositSummary, setRedepositSummary] = useState(null);
    const [mentorAgentsList, setMentorAgentsList] = useState([]);
    const [filterMentorAgent, setFilterMentorAgent] = useState('all');
    const [showClosingsDialog, setShowClosingsDialog] = useState(false);
    const [monthlyClosings, setMonthlyClosings] = useState(null);
    const [loadingClosings, setLoadingClosings] = useState(false);

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
        fetchRevenueSummary();
    }, [viewMode, filterMentorAgent]);

    const isHeadOrAdmin = ['academic_master', 'super_admin', 'admin'].includes(user?.role);
    const isSuperAdmin = user?.role === 'super_admin';

    // Fetch mentor agents for super admin / academic master filtering
    // Include both mentor and master_of_academics roles
    useEffect(() => {
        if (isSuperAdmin || isHeadOrAdmin) {
            Promise.all([
                apiClient.get('/users?role=mentor'),
                apiClient.get('/users?role=master_of_academics'),
                apiClient.get('/users?role=academic_master')
            ]).then(([mentorRes, moaRes, amRes]) => {
                const allMentors = [
                    ...(mentorRes.data || []),
                    ...(moaRes.data || []),
                    ...(amRes.data || [])
                ].filter(u => u.is_active !== false);
                // Remove duplicates by id
                const uniqueMentors = Array.from(new Map(allMentors.map(m => [m.id, m])).values());
                setMentorAgentsList(uniqueMentors);
            }).catch(() => {});
        }
    }, [isSuperAdmin, isHeadOrAdmin]);

    const fetchRevenueSummary = async () => {
        try {
            // Non-super-admin: show only own data. Super admin: show team or filtered mentor
            let params = '';
            if (!isSuperAdmin) {
                params = `?mentor_id=${user?.id}`;
            } else if (filterMentorAgent && filterMentorAgent !== 'all') {
                params = `?mentor_id=${filterMentorAgent}`;
            }
            const response = await apiClient.get(`/mentor/revenue-summary${params}`);
            setRedepositSummary(response.data);
        } catch (error) {
            console.error('Failed to fetch revenue summary:', error);
            try {
                const fallback = await apiClient.get('/mentor/redeposits/summary');
                setRedepositSummary(fallback.data);
            } catch (e) {
                console.error('Failed to fetch redeposit summary:', e);
            }
        }
    };

    const fetchMonthlyClosings = async () => {
        setLoadingClosings(true);
        try {
            let params = '';
            if (!isSuperAdmin) {
                params = `?mentor_id=${user?.id}`;
            } else if (filterMentorAgent && filterMentorAgent !== 'all') {
                params = `?mentor_id=${filterMentorAgent}`;
            }
            const response = await apiClient.get(`/mentor/monthly-closings${params}`);
            setMonthlyClosings(response.data);
            setShowClosingsDialog(true);
        } catch (error) {
            toast.error('Failed to load monthly closings');
        } finally {
            setLoadingClosings(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = { 
                search: searchTerm || undefined,
                activated_only: true
            };
            // In "my_work" mode, filter by mentor_id
            if (viewMode === 'my_work' || !isHeadOrAdmin) {
                params.mentor_id = user.id;
            }
            // Agent filter for super admin / academic master
            if (filterMentorAgent !== 'all') {
                params.mentor_id = filterMentorAgent;
            }
            const response = await studentApi.getAll(params);
            const mentorStudents = response.data.filter(s => s.mentor_id || s.mentor_stage);
            setStudents(mentorStudents);
            // Build team mentor summary for team view
            if (viewMode === 'team' && isHeadOrAdmin) {
                const mentorMap = {};
                mentorStudents.forEach(s => {
                    const key = s.mentor_id || 'unassigned';
                    if (!mentorMap[key]) mentorMap[key] = { id: key, name: s.mentor_name || 'Unassigned', count: 0 };
                    mentorMap[key].count++;
                });
                setTeamMentors(Object.values(mentorMap).sort((a, b) => b.count - a.count));
            }
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
            mentor_stage: student.mentor_stage || 'new_student',
            notes: '',
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

    const handleReassignMentor = async (studentId, newMentorId) => {
        try {
            await apiClient.post(`/students/${studentId}/reassign-mentor?new_mentor_id=${newMentorId}`);
            toast.success('Student reassigned successfully');
            fetchStudents();
            fetchRevenueSummary();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reassign student');
        }
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
        const isColumnDrop = MENTOR_STAGES.some(s => s.id === over.id);
        if (isColumnDrop) {
            targetStage = over.id;
        } else {
            // Dropped over another student - get that student's mentor_stage
            const overStudent = students.find(s => s.id === over.id);
            if (overStudent) {
                targetStage = overStudent.mentor_stage;
            }
        }

        // If dropped in a different stage, update the student
        if (targetStage && targetStage !== activeStudent.mentor_stage) {
            try {
                await studentApi.update(activeStudentId, { mentor_stage: targetStage });
                toast.success(`Student moved to ${MENTOR_STAGES.find(s => s.id === targetStage)?.label}`);
                fetchStudents();
            } catch (error) {
                toast.error('Failed to move student');
                console.error(error);
            }
        }
    };

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        
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
        });
    };

    return (
        <div className="space-y-6" data-testid="mentor-crm-page">
            {/* Monthly Revenue Summary Card */}
            {redepositSummary && (
                <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-emerald-100 text-sm">Monthly Redeposits ({redepositSummary.month})</p>
                                    <p className="text-3xl font-bold text-emerald-50">
                                        AED {Math.round(redepositSummary.totals?.grand_redeposits || redepositSummary.totals?.grand_total || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-12 w-px bg-emerald-500"></div>
                                <div>
                                    <p className="text-emerald-100 text-sm">Withdrawals</p>
                                    <p className="text-2xl font-semibold text-red-200">
                                        - AED {Math.round(redepositSummary.totals?.grand_withdrawals || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-12 w-px bg-emerald-500"></div>
                                <button 
                                    type="button"
                                    className="cursor-pointer hover:bg-emerald-800/50 rounded-lg px-3 py-1 transition-colors text-left"
                                    onClick={(e) => { e.stopPropagation(); fetchMonthlyClosings(); }}
                                    data-testid="net-revenue-click"
                                >
                                    <p className="text-emerald-100 text-sm">Net Active <span className="text-[10px] opacity-70">(click to view)</span></p>
                                    <p className="text-2xl font-bold text-yellow-200">
                                        AED {Math.round(redepositSummary.totals?.grand_net || (redepositSummary.totals?.grand_redeposits || redepositSummary.totals?.grand_total || 0) - (redepositSummary.totals?.grand_withdrawals || 0)).toLocaleString()}
                                    </p>
                                </button>
                                <div className="h-12 w-px bg-emerald-500"></div>
                                <div>
                                    <p className="text-emerald-100 text-sm">Students Pitched</p>
                                    <p className="text-2xl font-semibold">{redepositSummary.totals?.unique_students || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-8 w-8 text-emerald-200" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mentor CRM</h1>
                    <p className="text-muted-foreground">Manage student mentorship and redeposit pipeline</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="pl-9 w-64"
                            data-testid="search-mentor-students"
                        />
                    </div>
                    {(isSuperAdmin || isHeadOrAdmin) && mentorAgentsList.length > 0 && (
                        <Select value={filterMentorAgent} onValueChange={setFilterMentorAgent} data-testid="filter-mentor-agent">
                            <SelectTrigger className="w-[160px] h-9 text-xs" data-testid="filter-mentor-agent-trigger">
                                <SelectValue placeholder="All Mentors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Mentors</SelectItem>
                                {mentorAgentsList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    {['super_admin', 'admin', 'academic_master'].includes(user?.role) && (
                        <>
                            <ImportButton templateType="students_mentor" title="Import Students" onSuccess={fetchStudents} />
                            <ImportButton 
                                templateType="mentor_redeposits" 
                                title="Import Redeposits" 
                                onSuccess={() => { fetchStudents(); fetchRevenueSummary(); }} 
                            />
                        </>
                    )}
                    {['super_admin', 'admin', 'finance'].includes(user?.role) && (
                        <ImportButton 
                            templateType="mentor_withdrawals" 
                            title="Import Withdrawals" 
                            onSuccess={() => { fetchStudents(); fetchRevenueSummary(); }} 
                        />
                    )}
                </div>
            </div>

            {/* View Mode Toggle for Academic Master / Admin */}
            {isHeadOrAdmin && (
                <div className="flex items-center gap-3" data-testid="mentor-view-toggle">
                    <div className="inline-flex rounded-lg border p-1 bg-muted/30">
                        <button
                            onClick={() => setViewMode('my_work')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'my_work' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            data-testid="mentor-view-my-work"
                        >
                            My Students
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            data-testid="mentor-view-team"
                        >
                            Team Overview
                        </button>
                    </div>
                    {viewMode === 'team' && teamMentors.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {teamMentors.map(mentor => (
                                <Badge key={mentor.id} variant="secondary" className="text-xs">
                                    {mentor.name}: {mentor.count}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                        {MENTOR_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                students={students}
                                onView={handleViewStudent}
                                onSetReminder={handleSetReminder}
                                onHeaderClick={undefined}
                                headerExtra={undefined}
                                isSuperAdmin={isSuperAdmin}
                                mentorAgents={mentorAgentsList}
                                onReassign={handleReassignMentor}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <StudentCard
                                student={students.find(s => s.id === activeId)}
                                onView={() => {}}
                                onSetReminder={() => {}}
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
                        <DialogTitle>Student Mentorship</DialogTitle>
                        <DialogDescription>
                            Manage student progress and redeposit tracking
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedStudent && (
                        <div className="space-y-6">
                            {/* Student Info */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-white text-2xl font-bold">
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
                                                <Badge className={MENTOR_STAGES.find(s => s.id === selectedStudent.mentor_stage)?.color || 'bg-blue-500'}>
                                                    {MENTOR_STAGES.find(s => s.id === selectedStudent.mentor_stage)?.label || 'New Student'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Trading Level:</span>
                                            <span className="ml-2">{selectedStudent.trading_level || 'Beginner'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Preferred Language:</span>
                                            <span className="ml-2">{selectedStudent.preferred_language || 'English'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Classes Attended:</span>
                                            <span className="ml-2 font-mono">{selectedStudent.classes_attended || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Learning Goals:</span>
                                            <span className="ml-2">{selectedStudent.learning_goals || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Package:</span>
                                            <span className="ml-2">{selectedStudent.package_bought || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Enrolled:</span>
                                            <span className="ml-2">{formatDate(selectedStudent.created_at)}</span>
                                        </div>
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
                            
                            {/* Update Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Update Mentorship Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Mentorship Stage</Label>
                                        <Select
                                            value={updateData.mentor_stage}
                                            onValueChange={(value) => setUpdateData({ ...updateData, mentor_stage: value })}
                                        >
                                            <SelectTrigger data-testid="mentor-stage-select">
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MENTOR_STAGES.map((stage) => (
                                                    <SelectItem key={stage.id} value={stage.id}>
                                                        {stage.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Session Notes</Label>
                                        <Textarea
                                            value={updateData.notes}
                                            onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                                            placeholder="Add session notes, progress updates, redeposit recommendations..."
                                            rows={4}
                                            data-testid="mentor-notes-input"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdateStudent} data-testid="update-mentor-btn">
                                    Update Status
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

            {/* Monthly Closings Dialog - Net Revenue Breakdown */}
            <Dialog open={showClosingsDialog} onOpenChange={setShowClosingsDialog}>
                <DialogContent className="max-w-4xl max-h-[85vh]" data-testid="monthly-closings-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-500" />
                                Monthly Closings — {monthlyClosings?.month || ''}
                            </span>
                            {monthlyClosings?.totals && (
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-emerald-600 font-bold">Deposits: AED {Math.round(monthlyClosings.totals.deposits).toLocaleString()}</span>
                                    <span className="text-red-500 font-bold">Withdrawals: AED {Math.round(monthlyClosings.totals.withdrawals).toLocaleString()}</span>
                                    <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                                        Net: AED {Math.round(monthlyClosings.totals.net_revenue).toLocaleString()}
                                    </Badge>
                                </div>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[65vh]">
                        {loadingClosings ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
                            </div>
                        ) : monthlyClosings?.students?.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-xs">Sr</TableHead>
                                        <TableHead className="text-xs">Name</TableHead>
                                        <TableHead className="text-xs">Email</TableHead>
                                        <TableHead className="text-xs">Mobile</TableHead>
                                        <TableHead className="text-xs text-right">Deposit (AED)</TableHead>
                                        <TableHead className="text-xs text-right">Withdrawal (AED)</TableHead>
                                        <TableHead className="text-xs text-right">Net (AED)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthlyClosings.students.map((s, i) => (
                                        <TableRow key={s.student_id || i}>
                                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="text-xs font-medium">{s.student_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{s.student_email}</TableCell>
                                            <TableCell className="text-xs font-mono">{s.phone || '-'}</TableCell>
                                            <TableCell className="text-xs text-right font-mono text-emerald-600">
                                                {s.total_deposit > 0 ? Math.round(s.total_deposit).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-mono text-red-500">
                                                {s.total_withdrawal > 0 ? Math.round(s.total_withdrawal).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-mono font-bold">
                                                {Math.round(s.total_deposit - s.total_withdrawal).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell colSpan={4} className="text-xs text-right">Total</TableCell>
                                        <TableCell className="text-xs text-right font-mono text-emerald-600">
                                            {Math.round(monthlyClosings.totals.deposits).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono text-red-500">
                                            {Math.round(monthlyClosings.totals.withdrawals).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-xs text-right font-mono">
                                            {Math.round(monthlyClosings.totals.net_revenue).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                                No closings found for this month
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MentorCRMPage;
