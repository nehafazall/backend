import React, { useState, useEffect } from 'react';
import { useAuth, studentApi } from '@/lib/api';
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
import ImportButton from '@/components/ImportButton';
import ReminderModal from '@/components/ReminderModal';
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
} from 'lucide-react';

const MENTOR_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500', icon: User },
    { id: 'discussion_started', label: 'Discussion Started', color: 'bg-purple-500', icon: MessageSquare },
    { id: 'pitched_for_redeposit', label: 'Pitched Redeposit', color: 'bg-orange-500', icon: TrendingUp },
    { id: 'interested', label: 'Interested', color: 'bg-yellow-500', icon: CheckCircle },
    { id: 'closed', label: 'Closed (Deposit)', color: 'bg-emerald-500', icon: DollarSign },
];

const StudentCard = ({ student, onView, onSetReminder, isDragging }) => {
    const hasReminder = student.reminder_date && !student.reminder_completed;

    return (
        <div
            className={`kanban-card stage-${student.mentor_stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`mentor-card-${student.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-medium">
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                            {student.trading_level || 'Beginner'}
                        </p>
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
const SortableStudentCard = ({ student, onView, onSetReminder }) => {
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
            />
        </div>
    );
};

const KanbanColumn = ({ stage, students, onView, onSetReminder }) => {
    const stageStudents = students.filter(s => s.mentor_stage === stage.id);
    const StageIcon = stage.icon;
    
    return (
        <div className="kanban-column" data-testid={`mentor-column-${stage.id}`}>
            <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                    <StageIcon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary">{stageStudents.length}</Badge>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="space-y-3">
                    {stageStudents.map((student) => (
                        <StudentCard
                            key={student.id}
                            student={student}
                            onView={onView}
                            onSetReminder={onSetReminder}
                        />
                    ))}
                    {stageStudents.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No students
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

const MentorCRMPage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderStudent, setReminderStudent] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [updateData, setUpdateData] = useState({
        mentor_stage: '',
        notes: '',
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = { search: searchTerm || undefined };
            // For mentors, filter by mentor_id
            if (user?.role === 'mentor') {
                params.mentor_id = user.id;
            }
            const response = await studentApi.getAll(params);
            // Filter students who have mentors assigned (for mentor view)
            const mentorStudents = response.data.filter(s => s.mentor_id || s.mentor_stage);
            setStudents(mentorStudents);
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mentor CRM</h1>
                    <p className="text-muted-foreground">Manage student mentorship and redeposit pipeline</p>
                </div>
                <div className="flex items-center gap-3">
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
                    {['super_admin', 'admin', 'academic_master'].includes(user?.role) && (
                        <ImportButton templateType="students_mentor" title="Import Students" onSuccess={fetchStudents} />
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
                    {MENTOR_STAGES.map((stage) => (
                        <KanbanColumn
                            key={stage.id}
                            stage={stage}
                            students={students}
                            onView={handleViewStudent}
                            onSetReminder={handleSetReminder}
                        />
                    ))}
                </div>
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
        </div>
    );
};

export default MentorCRMPage;
