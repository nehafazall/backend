import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { PeriodFilter } from '@/components/PeriodFilter';
import { TransactionHistory } from '@/components/TransactionHistory';
import { ClickToCall, CallHistory } from '@/components/ClickToCall';
import ReminderModal from '@/components/ReminderModal';
import { Pagination } from '@/components/Pagination';
import {
    DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
    useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Search, Phone, PhoneCall, Mail, User, Briefcase, MessageSquare, TrendingUp,
    CheckCircle, DollarSign, MoreVertical, GripVertical, RefreshCw, Bell, Clock,
    Send, FileText, AlertTriangle, PhoneOff, Star, Shield,
} from 'lucide-react';

const BD_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-sky-500', icon: User },
    { id: 'contacted', label: 'Contacted', color: 'bg-violet-500', icon: MessageSquare },
    { id: 'pitched', label: 'Pitched', color: 'bg-amber-500', icon: TrendingUp },
    { id: 'interested', label: 'Interested', color: 'bg-lime-500', icon: CheckCircle },
    { id: 'closed', label: 'Closed (Redeposit)', color: 'bg-emerald-500', icon: DollarSign },
];

const COLOR_TAG_STYLES = {
    handle_with_care: { label: 'Handle With Care', color: 'bg-amber-100 border-amber-400 text-amber-800', dot: 'bg-amber-500', icon: AlertTriangle },
    do_not_disturb: { label: 'Do Not Disturb', color: 'bg-red-100 border-red-400 text-red-800', dot: 'bg-red-500', icon: PhoneOff },
    vip: { label: 'VIP Client', color: 'bg-yellow-100 border-yellow-500 text-yellow-800', dot: 'bg-yellow-500', icon: Star },
    priority: { label: 'Priority', color: 'bg-purple-100 border-purple-400 text-purple-800', dot: 'bg-purple-500', icon: Shield },
    follow_up: { label: 'Follow Up', color: 'bg-blue-100 border-blue-400 text-blue-800', dot: 'bg-blue-500', icon: Bell },
};

const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const BD_ROLES_SET = new Set(['business_development', 'business_development_manager_']);

const BDStudentCard = ({ student, onView, isDragging, isSuperAdmin, bdAgents, onReassign }) => {
    const colorTag = student.color_tag ? COLOR_TAG_STYLES[student.color_tag] : null;
    const isInClosed = student.bd_stage === 'closed';
    const hasRedeposited = (student.redeposit_count || 0) > 0;
    return (
        <div
            className={`kanban-card stage-${student.bd_stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''} ${isInClosed ? 'bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-300/30' : colorTag ? `${colorTag.color.split(' ')[0]} border-2 ${colorTag.color.split(' ')[1]}` : ''}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`bd-card-${student.id}`}
        >
            {isInClosed && (
                <div className="-mx-3 -mt-3 mb-2 px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold rounded-t-md bg-emerald-500 text-white">
                    <DollarSign className="h-3 w-3" /> Awaiting Redeposit Recording
                </div>
            )}
            {!isInClosed && colorTag && (
                <div className={`-mx-3 -mt-3 mb-2 px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold rounded-t-md ${colorTag.color}`}>
                    <colorTag.icon className="h-3 w-3" />
                    {colorTag.label}
                </div>
            )}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-medium">
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{student.full_name}</p>
                            {hasRedeposited && (
                                <Badge className="bg-emerald-500 text-white text-[10px] px-1 py-0">
                                    <DollarSign className="h-2 w-2 mr-0.5" />x{student.redeposit_count}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{student.package_bought || student.current_course_name || 'N/A'}</p>
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
                        {isSuperAdmin && bdAgents && bdAgents.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Reassign to:</DropdownMenuLabel>
                                {bdAgents.filter(a => a.id !== student.bd_agent_id).map(a => (
                                    <DropdownMenuItem
                                        key={a.id}
                                        onClick={(e) => { e.stopPropagation(); onReassign(student.id, a.id); }}
                                        data-testid={`bd-reassign-${student.id}-to-${a.id}`}
                                    >
                                        <RefreshCw className="h-3 w-3 mr-2" />
                                        {a.full_name}
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono text-xs">{student.phone}</span>
                </div>
                {student.mentor_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        <span className="text-xs">Mentor: {student.mentor_name}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                        {student.enrollment_amount ? fmtAED(student.enrollment_amount) : 'No deposit'}
                    </span>
                    {student.reminder_date && !student.reminder_completed && (
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                            <Bell className="h-2.5 w-2.5 mr-0.5" />
                            {student.reminder_date}
                        </Badge>
                    )}
                </div>
                {student.bd_agent_name && (
                    <Badge variant="outline" className="text-xs">{student.bd_agent_name}</Badge>
                )}
            </div>
        </div>
    );
};

const SortableBDCard = ({ student, onView, isSuperAdmin, bdAgents, onReassign }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: student.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <BDStudentCard student={student} onView={onView} isDragging={isDragging}
                isSuperAdmin={isSuperAdmin} bdAgents={bdAgents} onReassign={onReassign} />
        </div>
    );
};

const BDKanbanColumn = ({ stage, students, onView, isSuperAdmin, bdAgents, onReassign }) => {
    const stageStudents = students.filter(s => s.bd_stage === stage.id);
    const studentIds = stageStudents.map(s => s.id);
    const StageIcon = stage.icon;
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    return (
        <div ref={setNodeRef}
            className={`kanban-column ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            data-testid={`bd-column-${stage.id}`}
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
                        {stageStudents.map(s => (
                            <SortableBDCard key={s.id} student={s} onView={onView}
                                isSuperAdmin={isSuperAdmin} bdAgents={bdAgents} onReassign={onReassign} />
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

export default function BDCRMPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [bdAgents, setBdAgents] = useState([]);
    const [filterAgent, setFilterAgent] = useState('all');
    const [activeId, setActiveId] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRedepositModal, setShowRedepositModal] = useState(false);
    const [redepositData, setRedepositData] = useState({ amount_aed: '', date: new Date().toISOString().slice(0, 10) });
    const [periodFilter, setPeriodFilter] = useState(null);
    const [studentNotes, setStudentNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [allTimeTotals, setAllTimeTotals] = useState({ total: 0, stages: {}, revenue: 0 });

    const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role);
    const isBD = BD_ROLES_SET.has(user?.role);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        fetchStudents();
    }, [filterAgent, periodFilter, currentPage, pageSize]);

    useEffect(() => {
        if (isSuperAdmin || isBD) {
            apiClient.get('/bd/agents').then(r => setBdAgents(r.data || [])).catch(() => {});
        }
        // Fetch all-time stage totals (unfiltered)
        const agentParam = (isBD && !isSuperAdmin) ? '' : (filterAgent !== 'all' ? `&bd_agent_id=${filterAgent}` : '');
        apiClient.get(`/bd/dashboard?period=all_time${agentParam}`).then(r => {
            const d = r.data || {};
            setAllTimeTotals({
                total: d.total_students || 0,
                stages: d.stage_counts || {},
                revenue: d.all_time_revenue || 0,
            });
        }).catch(() => {});
    }, [filterAgent]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, page_size: pageSize };
            if (filterAgent !== 'all') params.bd_agent_id = filterAgent;
            if (searchTerm) params.search = searchTerm;
            if (periodFilter) {
                params.date_from = periodFilter.date_from;
                params.date_to = periodFilter.date_to;
            }
            const res = await apiClient.get('/bd/students', { params });
            const data = res.data;
            const items = data?.items || (Array.isArray(data) ? data : []);
            setStudents(items);
            setTotalRecords(data?.total || items.length);
            setTotalPages(data?.total_pages || 0);
        } catch (err) {
            toast.error('Failed to load BD students');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e) => setActiveId(e.active.id);
    const handleDragEnd = async (e) => {
        setActiveId(null);
        const { active, over } = e;
        if (!over || !active) return;
        const studentId = active.id;
        let newStage = over.id;
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // If dropped on a student card, find which stage that student belongs to
        if (!BD_STAGES.find(s => s.id === newStage)) {
            const targetStudent = students.find(s => s.id === newStage);
            if (targetStudent) {
                newStage = targetStudent.bd_stage;
            } else {
                return;
            }
        }

        if (student.bd_stage === newStage) return;

        // Optimistic update
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, bd_stage: newStage } : s));
        try {
            await apiClient.put(`/bd/students/${studentId}/stage`, { bd_stage: newStage });
            toast.success(`Moved to ${BD_STAGES.find(s => s.id === newStage)?.label}`);
        } catch (err) {
            toast.error('Failed to update stage');
            fetchStudents();
        }
    };

    const handleReassign = async (studentId, newAgentId) => {
        try {
            await apiClient.post(`/bd/students/${studentId}/reassign?new_bd_agent_id=${newAgentId}`);
            toast.success('Student reassigned');
            fetchStudents();
        } catch (err) {
            toast.error('Failed to reassign');
        }
    };

    const handleRecordRedeposit = async () => {
        if (!selectedStudent || !redepositData.amount_aed) return;
        try {
            await apiClient.post('/bd/record-redeposit', {
                student_id: selectedStudent.id,
                amount_aed: parseFloat(redepositData.amount_aed),
                amount: parseFloat(redepositData.amount_aed),
                date: redepositData.date,
            });
            toast.success('Redeposit recorded — student moved back to New Students');
            setShowRedepositModal(false);
            setRedepositData({ amount_aed: '', date: new Date().toISOString().slice(0, 10) });
            fetchStudents();
        } catch (err) {
            toast.error('Failed to record redeposit');
        }
    };

    const handleViewStudent = (student) => {
        setSelectedStudent(student);
        setShowDetailModal(true);
        setNewNote('');
        fetchStudentNotes(student.id);
    };

    const fetchStudentNotes = async (studentId) => {
        try {
            const res = await apiClient.get(`/students/${studentId}/notes`);
            setStudentNotes(Array.isArray(res.data) ? res.data : []);
        } catch { setStudentNotes([]); }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedStudent) return;
        setSavingNote(true);
        try {
            await apiClient.post(`/students/${selectedStudent.id}/notes`, { text: newNote, type: 'call_note' });
            toast.success('Note saved');
            setNewNote('');
            fetchStudentNotes(selectedStudent.id);
        } catch { toast.error('Failed to save note'); }
        setSavingNote(false);
    };

    const handleReminderSuccess = () => {
        fetchStudents();
        setShowReminderModal(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchStudents();
    };

    const [showRedepositOnly, setShowRedepositOnly] = useState(false);
    const filteredStudents = showRedepositOnly ? students.filter(s => (s.redeposit_count || 0) > 0) : students;
    const draggedStudent = students.find(s => s.id === activeId);

    return (
        <div className="space-y-6" data-testid="bd-crm-page">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Business Development CRM</h1>
                    <p className="text-muted-foreground text-sm">
                        {isBD ? `My Students (${students.length})` : `All BD Students (${students.length})`}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <PeriodFilter onChange={setPeriodFilter} dateFieldOptions={[{ value: 'deposit_date', label: 'By Deposit Date' }]} />
                    <Button
                        variant={showRedepositOnly ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => setShowRedepositOnly(!showRedepositOnly)}
                        data-testid="bd-redeposit-filter"
                    >
                        <DollarSign className="h-3 w-3" />
                        Redeposit Students
                        {showRedepositOnly && <span>({filteredStudents.length})</span>}
                    </Button>
                    {isSuperAdmin && bdAgents.length > 0 && (
                        <Select value={filterAgent} onValueChange={setFilterAgent}>
                            <SelectTrigger className="w-[180px]" data-testid="bd-agent-filter">
                                <SelectValue placeholder="All BD Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All BD Agents</SelectItem>
                                {bdAgents.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* All-Time Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="relative overflow-hidden" data-testid="bd-stat-total">
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Students</p>
                        <p className="text-2xl font-bold mt-1">{allTimeTotals.total}</p>
                        <p className="text-xs text-muted-foreground">{fmtAED(allTimeTotals.revenue)} revenue</p>
                    </CardContent>
                </Card>
                {BD_STAGES.map(st => (
                    <Card key={st.id} className="relative overflow-hidden" data-testid={`bd-stat-${st.id}`}>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className={`absolute top-0 left-0 w-1 h-full ${st.color}`} />
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{st.label}</p>
                            <p className="text-2xl font-bold mt-1">{allTimeTotals.stages[st.id] || 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10" data-testid="bd-search-input" />
                </div>
                <Button type="submit" variant="secondary" data-testid="bd-search-btn">Search</Button>
            </form>

            {/* Kanban Board */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="kanban-board" data-testid="bd-kanban-board">
                        {BD_STAGES.map(stage => (
                            <BDKanbanColumn key={stage.id} stage={stage} students={filteredStudents}
                                onView={handleViewStudent} isSuperAdmin={isSuperAdmin} bdAgents={bdAgents}
                                onReassign={handleReassign} />
                        ))}
                    </div>
                    <DragOverlay>
                        {draggedStudent ? (
                            <BDStudentCard student={draggedStudent} onView={() => {}} isDragging
                                isSuperAdmin={false} bdAgents={[]} onReassign={() => {}} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Pagination */}
            {!loading && students.length > 0 && (
                <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    total={totalRecords}
                    pageSize={pageSize}
                    onPageChange={(p) => setCurrentPage(p)}
                    onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                />
            )}

            {/* Student Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="bd-student-detail-modal">
                    <DialogHeader className="sr-only"><DialogTitle>{selectedStudent?.full_name || 'Student Details'}</DialogTitle></DialogHeader>
                    {selectedStudent && (
                        <>
                            {/* Compact Header - Always Visible */}
                            <div className="flex items-center gap-3 pb-3 border-b">
                                <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {selectedStudent.full_name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-semibold truncate">{selectedStudent.full_name}</h3>
                                        <Badge className={`text-[10px] ${BD_STAGES.find(s => s.id === selectedStudent.bd_stage)?.color}`}>
                                            {BD_STAGES.find(s => s.id === selectedStudent.bd_stage)?.label}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedStudent.phone}</span>
                                        {selectedStudent.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedStudent.email}</span>}
                                        <span>{selectedStudent.package_bought || selectedStudent.current_course_name || 'N/A'}</span>
                                    </div>
                                </div>
                                <ClickToCall
                                    phoneNumber={selectedStudent.phone}
                                    contactId={selectedStudent.id}
                                    contactName={selectedStudent.full_name}
                                    variant="outline"
                                    size="sm"
                                    showLabel={false}
                                />
                                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowReminderModal(true)} data-testid="bd-set-reminder-btn">
                                    <Bell className="h-3 w-3" /> Reminder
                                </Button>
                            </div>

                            {/* Tabbed Content */}
                            <Tabs defaultValue="info" className="mt-2">
                                <TabsList className="grid w-full grid-cols-4 h-8">
                                    <TabsTrigger value="info" className="text-xs" data-testid="bd-tab-info">Info</TabsTrigger>
                                    <TabsTrigger value="transactions" className="text-xs" data-testid="bd-tab-transactions">
                                        <DollarSign className="h-3 w-3 mr-1" />Transactions
                                    </TabsTrigger>
                                    <TabsTrigger value="calls" className="text-xs" data-testid="bd-tab-calls">
                                        <PhoneCall className="h-3 w-3 mr-1" />Calls
                                    </TabsTrigger>
                                    <TabsTrigger value="update" className="text-xs" data-testid="bd-tab-update">Update</TabsTrigger>
                                </TabsList>

                                {/* INFO TAB */}
                                <TabsContent value="info" className="mt-3 space-y-4" data-testid="bd-tab-content-info">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-muted-foreground">Course:</span><span className="ml-2">{selectedStudent.package_bought || selectedStudent.current_course_name || 'N/A'}</span></div>
                                        <div><span className="text-muted-foreground">BD Agent:</span><span className="ml-2">{selectedStudent.bd_agent_name || 'Unassigned'}</span></div>
                                        <div><span className="text-muted-foreground">Mentor:</span><span className="ml-2">{selectedStudent.mentor_name || 'N/A'}</span></div>
                                        <div><span className="text-muted-foreground">Enrollment:</span><span className="ml-2 font-mono">{fmtAED(selectedStudent.enrollment_amount)}</span></div>
                                        <div><span className="text-muted-foreground">Language:</span><span className="ml-2">{selectedStudent.preferred_language || 'N/A'}</span></div>
                                        <div><span className="text-muted-foreground">Country:</span><span className="ml-2">{selectedStudent.country || 'N/A'}</span></div>
                                    </div>
                                    {selectedStudent.reminder_date && !selectedStudent.reminder_completed && (
                                        <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 text-sm">
                                            <span className="flex items-center gap-1 text-amber-600 font-medium"><Bell className="h-3 w-3" /> Reminder: {selectedStudent.reminder_date} {selectedStudent.reminder_time || ''}</span>
                                            {selectedStudent.reminder_note && <p className="text-xs text-muted-foreground mt-0.5">{selectedStudent.reminder_note}</p>}
                                        </div>
                                    )}
                                    {/* Color Tags */}
                                    <div className="flex items-center gap-2 flex-wrap" data-testid="bd-color-tag-picker">
                                        <span className="text-xs text-muted-foreground mr-1">Tag:</span>
                                        {Object.entries(COLOR_TAG_STYLES).map(([id, tag]) => (
                                            <button key={id}
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${selectedStudent.color_tag === id ? tag.color + ' ring-2 ring-offset-1 ring-current font-bold' : 'border-muted text-muted-foreground hover:border-foreground'}`}
                                                onClick={async () => {
                                                    const newTag = selectedStudent.color_tag === id ? null : id;
                                                    try {
                                                        await apiClient.patch(`/students/${selectedStudent.id}/color-tag`, { color_tag: newTag });
                                                        setSelectedStudent(prev => ({ ...prev, color_tag: newTag }));
                                                        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, color_tag: newTag } : s));
                                                    } catch { toast.error('Failed to update tag'); }
                                                }}
                                                data-testid={`bd-color-tag-btn-${id}`}>
                                                <div className={`h-2 w-2 rounded-full ${tag.dot}`} />{tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* TRANSACTIONS TAB */}
                                <TabsContent value="transactions" className="mt-3" data-testid="bd-tab-content-transactions">
                                    <TransactionHistory studentId={selectedStudent.id} />
                                </TabsContent>

                                {/* CALLS TAB */}
                                <TabsContent value="calls" className="mt-3 space-y-3" data-testid="bd-tab-content-calls">
                                    <CallHistory contactId={selectedStudent.id} />
                                    {/* Follow-up Notes */}
                                    <div className="space-y-2 pt-3 border-t">
                                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                                            <FileText className="h-3.5 w-3.5" /> Follow-up Notes
                                        </Label>
                                        <div className="flex gap-2">
                                            <Textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                                                placeholder="Add call notes, discussion summary..." rows={2}
                                                className="flex-1 text-sm" data-testid="bd-note-input" />
                                            <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || savingNote}
                                                className="self-end" data-testid="bd-save-note-btn">
                                                <Send className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {studentNotes.length > 0 && (
                                            <ScrollArea className="max-h-[140px]">
                                                <div className="space-y-1.5">
                                                    {studentNotes.map(n => (
                                                        <div key={n.id} className="p-2 bg-muted/50 rounded text-sm border-l-2 border-sky-400">
                                                            <p className="whitespace-pre-wrap">{n.text}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                                                                <span>{n.created_by_name}</span>
                                                                <span>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                        {studentNotes.length === 0 && (
                                            <p className="text-xs text-muted-foreground py-2">No notes yet. Add your first call note above.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* UPDATE TAB */}
                                <TabsContent value="update" className="mt-3 space-y-4" data-testid="bd-tab-content-update">
                                    <div className="space-y-2">
                                        <Label>Move to Stage</Label>
                                        <Select value={selectedStudent.bd_stage} onValueChange={async (val) => {
                                            try {
                                                await apiClient.put(`/bd/students/${selectedStudent.id}/stage`, { bd_stage: val });
                                                setSelectedStudent(prev => ({ ...prev, bd_stage: val }));
                                                setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, bd_stage: val } : s));
                                                toast.success(`Stage updated to ${BD_STAGES.find(s => s.id === val)?.label}`);
                                            } catch { toast.error('Failed to update stage'); }
                                        }}>
                                            <SelectTrigger data-testid="bd-stage-change-dropdown"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {BD_STAGES.map(st => (
                                                    <SelectItem key={st.id} value={st.id}>
                                                        <span className="flex items-center gap-1.5">
                                                            <span className={`w-2 h-2 rounded-full ${st.color}`} />
                                                            {st.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
                                        <Button onClick={() => { setShowRedepositModal(true); setShowDetailModal(false); }}
                                            data-testid="bd-record-redeposit-btn">
                                            <DollarSign className="h-4 w-4 mr-2" /> Record Redeposit
                                        </Button>
                                    </DialogFooter>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Record Redeposit Modal */}
            <Dialog open={showRedepositModal} onOpenChange={setShowRedepositModal}>
                <DialogContent className="max-w-sm" data-testid="bd-redeposit-modal">
                    <DialogHeader>
                        <DialogTitle>Record Redeposit</DialogTitle>
                        <DialogDescription>For {selectedStudent?.full_name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Amount (AED)</Label>
                            <Input type="number" placeholder="e.g. 5000" value={redepositData.amount_aed}
                                onChange={e => setRedepositData(p => ({ ...p, amount_aed: e.target.value }))}
                                data-testid="bd-redeposit-amount" />
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input type="date" value={redepositData.date}
                                onChange={e => setRedepositData(p => ({ ...p, date: e.target.value }))}
                                data-testid="bd-redeposit-date" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRedepositModal(false)}>Cancel</Button>
                        <Button onClick={handleRecordRedeposit} disabled={!redepositData.amount_aed}
                            data-testid="bd-redeposit-confirm-btn">
                            Confirm Redeposit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reminder Modal */}
            <ReminderModal
                open={showReminderModal}
                onClose={() => setShowReminderModal(false)}
                entityType="student"
                entityId={selectedStudent?.id}
                entityName={selectedStudent?.full_name}
                onSuccess={handleReminderSuccess}
            />
        </div>
    );
}
