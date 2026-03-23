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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { PeriodFilter } from '@/components/PeriodFilter';
import { TransactionHistory } from '@/components/TransactionHistory';
import {
    DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Search, Phone, Mail, User, Briefcase, MessageSquare, TrendingUp,
    CheckCircle, DollarSign, MoreVertical, GripVertical, RefreshCw,
} from 'lucide-react';

const BD_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-sky-500', icon: User },
    { id: 'contacted', label: 'Contacted', color: 'bg-violet-500', icon: MessageSquare },
    { id: 'pitched', label: 'Pitched', color: 'bg-amber-500', icon: TrendingUp },
    { id: 'interested', label: 'Interested', color: 'bg-lime-500', icon: CheckCircle },
    { id: 'closed', label: 'Closed (Redeposit)', color: 'bg-emerald-500', icon: DollarSign },
];

const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const BDStudentCard = ({ student, onView, isDragging, isSuperAdmin, bdAgents, onReassign }) => {
    return (
        <div
            className={`kanban-card stage-${student.bd_stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`bd-card-${student.id}`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-medium">
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{student.full_name}</p>
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
                <span className="text-xs text-muted-foreground">
                    {student.enrollment_amount ? fmtAED(student.enrollment_amount) : 'No deposit'}
                </span>
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

    const isSuperAdmin = ['super_admin', 'admin'].includes(user?.role);
    const isBD = user?.role === 'business_development';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        fetchStudents();
    }, [filterAgent, periodFilter]);

    useEffect(() => {
        if (isSuperAdmin || isBD) {
            apiClient.get('/bd/agents').then(r => setBdAgents(r.data || [])).catch(() => {});
        }
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterAgent !== 'all') params.bd_agent_id = filterAgent;
            if (searchTerm) params.search = searchTerm;
            if (periodFilter) {
                params.date_from = periodFilter.date_from;
                params.date_to = periodFilter.date_to;
            }
            const res = await apiClient.get('/bd/students', { params });
            setStudents(Array.isArray(res.data) ? res.data : []);
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
        const newStage = over.id;
        const student = students.find(s => s.id === studentId);
        if (!student || student.bd_stage === newStage) return;
        if (!BD_STAGES.find(s => s.id === newStage)) return;

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
            toast.success('Redeposit recorded successfully');
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
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchStudents();
    };

    const filteredStudents = students;
    const draggedStudent = students.find(s => s.id === activeId);

    const totalByStage = BD_STAGES.reduce((acc, st) => {
        acc[st.id] = students.filter(s => s.bd_stage === st.id).length;
        return acc;
    }, {});

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

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {BD_STAGES.map(st => (
                    <Card key={st.id} className="relative overflow-hidden" data-testid={`bd-stat-${st.id}`}>
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className={`absolute top-0 left-0 w-1 h-full ${st.color}`} />
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{st.label}</p>
                            <p className="text-2xl font-bold mt-1">{totalByStage[st.id] || 0}</p>
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

            {/* Student Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-lg" data-testid="bd-student-detail-modal">
                    <DialogHeader>
                        <DialogTitle>{selectedStudent?.full_name}</DialogTitle>
                        <DialogDescription>Student Details</DialogDescription>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><Label className="text-muted-foreground">Phone</Label><p className="font-mono">{selectedStudent.phone}</p></div>
                                <div><Label className="text-muted-foreground">Email</Label><p>{selectedStudent.email || 'N/A'}</p></div>
                                <div><Label className="text-muted-foreground">Course</Label><p>{selectedStudent.package_bought || selectedStudent.current_course_name || 'N/A'}</p></div>
                                <div><Label className="text-muted-foreground">BD Stage</Label>
                                    <Badge className={`${BD_STAGES.find(s => s.id === selectedStudent.bd_stage)?.color || 'bg-gray-500'} text-white`}>
                                        {BD_STAGES.find(s => s.id === selectedStudent.bd_stage)?.label || selectedStudent.bd_stage}
                                    </Badge>
                                </div>
                                <div><Label className="text-muted-foreground">BD Agent</Label><p>{selectedStudent.bd_agent_name || 'Unassigned'}</p></div>
                                <div><Label className="text-muted-foreground">Mentor</Label><p>{selectedStudent.mentor_name || 'N/A'}</p></div>
                                <div><Label className="text-muted-foreground">Enrollment Amount</Label><p>{fmtAED(selectedStudent.enrollment_amount)}</p></div>
                                <div><Label className="text-muted-foreground">Language</Label><p>{selectedStudent.preferred_language || 'N/A'}</p></div>
                            </div>
                            {selectedStudent.notes && (
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-2 rounded">{selectedStudent.notes}</p>
                                </div>
                            )}
                            {/* Customer Transaction History */}
                            <div>
                                <Label className="text-muted-foreground flex items-center gap-1.5 mb-2">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Transaction History
                                </Label>
                                <TransactionHistory studentId={selectedStudent.id} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
                        <Button onClick={() => { setShowRedepositModal(true); setShowDetailModal(false); }}
                            data-testid="bd-record-redeposit-btn">
                            <DollarSign className="h-4 w-4 mr-2" /> Record Redeposit
                        </Button>
                    </DialogFooter>
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
        </div>
    );
}
