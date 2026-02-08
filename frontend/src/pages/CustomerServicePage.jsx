import React, { useState, useEffect } from 'react';
import { useAuth, studentApi } from '@/lib/api';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';

const CS_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500', icon: User },
    { id: 'activated', label: 'Activated', color: 'bg-emerald-500', icon: CheckCircle },
    { id: 'satisfactory_call', label: 'Satisfactory Call', color: 'bg-purple-500', icon: Phone },
    { id: 'pitched_for_upgrade', label: 'Pitched Upgrade', color: 'bg-orange-500', icon: TrendingUp },
    { id: 'in_progress', label: 'In Progress', color: 'bg-cyan-500', icon: Clock },
    { id: 'interested', label: 'Interested', color: 'bg-yellow-500', icon: CheckCircle },
    { id: 'not_interested', label: 'Not Interested', color: 'bg-rose-500', icon: User },
];

const StudentCard = ({ student, onView, onSetReminder }) => {
    const hasReminder = student.reminder_date && !student.reminder_completed;

    return (
        <div
            className={`kanban-card stage-${student.stage} animate-fade-in cursor-pointer`}
            onClick={() => onView(student)}
            data-testid={`student-card-${student.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
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
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono">{student.phone}</span>
                </p>
                {student.package_bought && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        {student.package_bought}
                    </p>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    {student.onboarding_complete && (
                        <Badge className="bg-emerald-500 text-white text-xs">Onboarded</Badge>
                    )}
                    {student.upgrade_eligible && (
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

const KanbanColumn = ({ stage, students, onView, onSetReminder }) => {
    const stageStudents = students.filter(s => s.stage === stage.id);
    const StageIcon = stage.icon;
    
    return (
        <div className="kanban-column" data-testid={`cs-column-${stage.id}`}>
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

const CustomerServicePage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderStudent, setReminderStudent] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [updateData, setUpdateData] = useState({
        stage: '',
        notes: '',
        onboarding_complete: false,
        classes_attended: 0,
    });

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
                        <ImportButton templateType="students_cs" title="Import Students" onSuccess={fetchStudents} />
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
                    {CS_STAGES.map((stage) => (
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
                                    
                                    {/* 3CX Call Recording - Placeholder for future integration */}
                                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <PhoneCall className="h-4 w-4 text-muted-foreground" />
                                            <Label className="text-sm text-muted-foreground">3CX Call Recording</Label>
                                            <Badge variant="outline" className="text-xs ml-auto">Coming Soon</Badge>
                                        </div>
                                        <Input
                                            value={selectedStudent.call_recording_url || ''}
                                            placeholder="Call recording URL will appear here after 3CX integration"
                                            disabled
                                            className="bg-background/50 cursor-not-allowed"
                                            data-testid="call-recording-url"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            This field will automatically populate with call recordings once 3CX integration is configured.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            
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
        </div>
    );
};

export default CustomerServicePage;
