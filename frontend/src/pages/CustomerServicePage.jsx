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
import { TransactionHistory } from '@/components/TransactionHistory';
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
import { PeriodFilter } from '@/components/PeriodFilter';
import { Pagination } from '@/components/Pagination';
import MergeStudentModal from '@/components/MergeStudentModal';
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
    Download,
    DollarSign,
    GitMerge,
    Palette,
    Shield,
    Star,
    AlertTriangle,
    PhoneOff,
    BarChart3,
    RefreshCw,
    LayoutGrid,
    List,
} from 'lucide-react';

const COLOR_TAGS = [
    { id: 'handle_with_care', label: 'Handle With Care', color: 'bg-amber-100 border-amber-400 text-amber-800', dot: 'bg-amber-500', icon: AlertTriangle },
    { id: 'do_not_disturb', label: 'Do Not Disturb', color: 'bg-red-100 border-red-400 text-red-800', dot: 'bg-red-500', icon: PhoneOff },
    { id: 'vip', label: 'VIP Client', color: 'bg-yellow-100 border-yellow-500 text-yellow-800', dot: 'bg-yellow-500', icon: Star },
    { id: 'priority', label: 'Priority', color: 'bg-purple-100 border-purple-400 text-purple-800', dot: 'bg-purple-500', icon: Shield },
    { id: 'follow_up', label: 'Follow Up', color: 'bg-blue-100 border-blue-400 text-blue-800', dot: 'bg-blue-500', icon: Bell },
];

const getColorTagStyle = (tag) => COLOR_TAGS.find(t => t.id === tag) || null;

const CS_STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500', icon: User },
    { id: 'activated', label: 'Activated', color: 'bg-emerald-500', icon: CheckCircle },
    { id: 'satisfactory_call', label: 'Satisfactory Call', color: 'bg-purple-500', icon: Phone },
    { id: 'pitched_for_upgrade', label: 'Pitched Upgrade', color: 'bg-orange-500', icon: TrendingUp },
    { id: 'upgraded', label: 'Upgraded', color: 'bg-emerald-600', icon: ArrowUp },
];

const StudentCard = ({ student, onView, onSetReminder, onInitiateUpgrade, isDragging, isSuperAdmin, csAgents, onQuickReassign, onColorTag }) => {
    const [showReassign, setShowReassign] = React.useState(false);
    const hasReminder = student.reminder_date && !student.reminder_completed;
    const isUpgradedStudent = student.is_upgraded_student;
    const isShadow = student.is_shadow;
    const isNewImport = student.is_new_from_import;
    const courseLevel = student.course_level || '';
    const courseName = courseLevel || student.current_course_name || student.package_bought;
    const courseColors = getCourseColor(courseName);
    const nextLevel = courseColors.next;
    const colorTag = getColorTagStyle(student.color_tag);

    // Color tag takes priority for border/bg
    const cardBorder = colorTag
        ? `border-2 ${colorTag.color.split(' ')[1]}`
        : isNewImport
            ? 'border-2 border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-400/30'
            : isUpgradedStudent ? `${courseColors.border} border-2` : '';
    const cardBg = colorTag
        ? colorTag.color.split(' ')[0]
        : isNewImport
            ? 'bg-cyan-50/50 dark:bg-cyan-900/20'
            : isUpgradedStudent ? courseColors.bg : '';

    return (
        <div
            className={`kanban-card stage-${student.stage} animate-fade-in cursor-pointer ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''} ${cardBg} ${cardBorder}`}
            onClick={() => !isDragging && onView(student)}
            data-testid={`student-card-${student.id}`}
        >
            {/* Color tag indicator strip */}
            {colorTag && (
                <div className={`-mx-3 -mt-3 mb-2 px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold rounded-t-md ${colorTag.color}`} data-testid={`color-tag-${student.id}`}>
                    <colorTag.icon className="h-3 w-3" />
                    {colorTag.label}
                </div>
            )}
            {/* Shadow card indicator */}
            {isShadow && (
                <div className="-mx-3 -mt-3 mb-2 px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold rounded-t-md bg-emerald-100 text-emerald-700 border-b border-emerald-300" data-testid={`shadow-indicator-${student.id}`}>
                    <ArrowUp className="h-3 w-3" />
                    Upgraded &middot; AED {(student.amount || 0).toLocaleString()}
                </div>
            )}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className={`w-8 h-8 rounded-full ${isNewImport ? 'bg-cyan-500 text-white' : isUpgradedStudent ? courseColors.bg + ' ' + courseColors.text : 'bg-emerald-600 text-white'} flex items-center justify-center text-sm font-medium`}>
                        {student.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{student.full_name}</p>
                            {isNewImport && (
                                <Badge className="bg-cyan-500 text-white text-[10px] px-1 py-0">NEW</Badge>
                            )}
                            {isUpgradedStudent && (
                                <Badge className="bg-emerald-500 text-white text-[10px] px-1 py-0">
                                    <ArrowUp className="h-2 w-2 mr-0.5" />
                                    x{student.upgrade_count || 1}
                                </Badge>
                            )}
                        </div>
                        {student.cs_agent_name && (
                            <div className="relative">
                                {isSuperAdmin ? (
                                    <button
                                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                        onClick={(e) => { e.stopPropagation(); setShowReassign(!showReassign); }}
                                        data-testid={`cs-reassign-btn-${student.id}`}
                                    >
                                        Agent: {student.cs_agent_name}
                                    </button>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Agent: {student.cs_agent_name}
                                    </p>
                                )}
                                {showReassign && isSuperAdmin && (
                                    <div className="absolute z-50 top-6 left-0 bg-popover border rounded-md shadow-lg p-1 min-w-[180px] max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                        {(csAgents || []).map(agent => (
                                            <button
                                                key={agent.id}
                                                className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${agent.id === student.cs_agent_id ? 'bg-accent font-medium' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); onQuickReassign(student, agent); setShowReassign(false); }}
                                                data-testid={`cs-reassign-agent-${agent.id}`}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(student); }}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetReminder(student); }}>
                            <Bell className="h-4 w-4 mr-2" />
                            Set Reminder
                        </DropdownMenuItem>
                        {!isShadow && onColorTag && (
                            <>
                                <DropdownMenuSeparator />
                                {COLOR_TAGS.map(tag => (
                                    <DropdownMenuItem key={tag.id} onClick={(e) => { e.stopPropagation(); onColorTag(student, student.color_tag === tag.id ? null : tag.id); }}>
                                        <div className={`h-3 w-3 rounded-full mr-2 ${tag.dot}`} />
                                        {student.color_tag === tag.id ? `Remove ${tag.label}` : tag.label}
                                    </DropdownMenuItem>
                                ))}
                                {student.color_tag && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onColorTag(student, null); }} className="text-muted-foreground">
                                        Clear Tag
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
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
                {isShadow ? (
                    <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-3 w-3" />
                            <span className="text-xs">{student.course_upgrade || student.upgrade_to_course}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-mono text-xs">AED {(student.amount || 0).toLocaleString()}</span>
                        </div>
                        {student.date && (
                            <div className="text-xs text-muted-foreground">
                                {new Date(student.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
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
                    <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <Badge className={`${courseColors.bg} ${courseColors.text} ${courseColors.border} border text-xs`}>
                            {courseColors.label || courseName}
                        </Badge>
                        {nextLevel && (
                            <span className="text-[10px] text-muted-foreground">
                                <ArrowUp className="inline h-2.5 w-2.5" /> {nextLevel}
                            </span>
                        )}
                    </div>
                )}
                    </>
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
                    {student.last_upgrade_date && (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-emerald-300" data-testid={`upgrade-date-${student.id}`}>
                            <ArrowUp className="h-3 w-3 mr-0.5 text-emerald-500" />
                            {new Date(student.last_upgrade_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
const SortableStudentCard = ({ student, onView, onSetReminder, onInitiateUpgrade, isSuperAdmin, csAgents, onQuickReassign, onColorTag }) => {
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
                isSuperAdmin={isSuperAdmin}
                csAgents={csAgents}
                onQuickReassign={onQuickReassign}
                onColorTag={onColorTag}
            />
        </div>
    );
};

const COLUMN_PAGE_SIZE = 50;

const KanbanColumn = ({ stage, baseParams, shadowCards, onView, onSetReminder, onInitiateUpgrade, isSuperAdmin, csAgents, onQuickReassign, onColorTag, stageTotal, onStudentsFetched }) => {
    const [colPage, setColPage] = React.useState(1);
    const [colStudents, setColStudents] = React.useState([]);
    const [colTotal, setColTotal] = React.useState(stageTotal || 0);
    const [colLoading, setColLoading] = React.useState(true);
    const StageIcon = stage.icon;

    // Fetch this column's data independently
    React.useEffect(() => {
        let cancelled = false;
        const fetchColumnData = async () => {
            setColLoading(true);
            try {
                const res = await studentApi.getAll({ ...baseParams, stage: stage.id, page: colPage, page_size: COLUMN_PAGE_SIZE });
                if (cancelled) return;
                const data = res.data;
                const items = data?.items || (Array.isArray(data) ? data : []);
                setColStudents(items);
                setColTotal(data?.total || items.length);
                if (onStudentsFetched) onStudentsFetched(stage.id, items);
            } catch {
                if (!cancelled) setColStudents([]);
            }
            if (!cancelled) setColLoading(false);
        };
        fetchColumnData();
        return () => { cancelled = true; };
    }, [colPage, baseParams?.cs_agent_id, stage.id]);

    // For the Upgraded column, merge in shadow cards on page 1
    const displayStudents = stage.id === 'upgraded' && shadowCards?.length > 0 && colPage === 1
        ? [...shadowCards, ...colStudents.filter(s => !s.is_shadow)]
        : colStudents;

    const totalForDisplay = stage.id === 'upgraded' && shadowCards?.length > 0
        ? colTotal + shadowCards.length
        : colTotal;
    const totalColPages = Math.ceil(colTotal / COLUMN_PAGE_SIZE);
    const studentIds = displayStudents.map(s => s.id);

    // Make column a drop target
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`flex flex-col min-w-0 flex-1 bg-muted/50 rounded-xl p-3 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
            data-testid={`cs-column-${stage.id}`}
            style={{ minHeight: '400px', maxHeight: 'calc(100vh - 280px)' }}
        >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                    <StageIcon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{totalForDisplay}</Badge>
            </div>
            
            {colLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <SortableContext items={studentIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2 min-h-[80px] p-0.5">
                            {displayStudents.map((student) => (
                                <SortableStudentCard
                                    key={student.id}
                                    student={student}
                                    onView={onView}
                                    onSetReminder={onSetReminder}
                                    onInitiateUpgrade={onInitiateUpgrade}
                                    isSuperAdmin={isSuperAdmin}
                                    csAgents={csAgents}
                                    onQuickReassign={onQuickReassign}
                                    onColorTag={onColorTag}
                                />
                            ))}
                            {displayStudents.length === 0 && (
                                <div className={`text-center text-muted-foreground py-6 text-xs border-2 border-dashed rounded-lg transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                                    Drop students here
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </ScrollArea>
            )}
            
            {/* Per-column pagination */}
            {totalColPages > 1 && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                    <button 
                        onClick={() => setColPage(p => Math.max(1, p - 1))} 
                        disabled={colPage <= 1}
                        className="text-xs px-2 py-1 rounded bg-background border hover:bg-accent disabled:opacity-40"
                        data-testid={`col-prev-${stage.id}`}
                    >
                        Prev
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                        {(colPage - 1) * COLUMN_PAGE_SIZE + 1}-{Math.min(colPage * COLUMN_PAGE_SIZE, colTotal)} of {colTotal}
                    </span>
                    <button 
                        onClick={() => setColPage(p => Math.min(totalColPages, p + 1))} 
                        disabled={colPage >= totalColPages}
                        className="text-xs px-2 py-1 rounded bg-background border hover:bg-accent disabled:opacity-40"
                        data-testid={`col-next-${stage.id}`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

const CustomerServicePage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamAgents, setTeamAgents] = useState([]);
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
    
    // Summary bar state
    const [stageSummary, setStageSummary] = useState(null);
    // Shadow cards for Upgraded column
    const [shadowCards, setShadowCards] = useState([]);
    // LTV sort toggle: null (off), 'desc', 'asc'
    const [ltvSort, setLtvSort] = useState(null);
    
    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeStudent, setUpgradeStudent] = useState(null);
    // Merge modal state
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeStudent, setMergeStudent] = useState(null);
    // Upgrade pricing modal (pitched_for_upgrade)
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingStudent, setPricingStudent] = useState(null);
    // Upgrade confirm + payment modal (upgraded)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmStudent, setConfirmStudent] = useState(null);
    const [csPeriodFilter, setCsPeriodFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const isHeadOrAdmin = ['cs_head', 'super_admin', 'admin'].includes(user?.role);
    const isSuperAdmin = user?.role === 'super_admin';
    const [viewMode, setViewMode] = useState(
        ['cs_head', 'super_admin', 'admin'].includes(user?.role) ? 'team' : 'my_work'
    );
    const [csAgentsList, setCsAgentsList] = useState([]);
    const [filterCSAgent, setFilterCSAgent] = useState('all');
    const [displayMode, setDisplayMode] = useState('kanban'); // 'kanban' or 'table'
    const [tableStageFilter, setTableStageFilter] = useState('all'); // stage filter for table view

    useEffect(() => {
        fetchStudents();
        fetchStageSummary();
        fetchShadowCards();
    }, [viewMode, filterCSAgent, csPeriodFilter, currentPage, pageSize, ltvSort, displayMode, tableStageFilter]);

    // Fetch CS agents for super admin quick reassign & filtering
    useEffect(() => {
        if (isSuperAdmin || isHeadOrAdmin) {
            apiClient.get('/users?department=Customer Service').then(res => setCsAgentsList(res.data || [])).catch(() => {});
        }
    }, [isSuperAdmin, isHeadOrAdmin]);

    // Track all visible students across columns for DnD
    const [kanbanStudentsMap, setKanbanStudentsMap] = useState({});
    const allKanbanStudents = React.useMemo(() => Object.values(kanbanStudentsMap).flat(), [kanbanStudentsMap]);

    const handleColumnStudentsFetched = React.useCallback((stageId, items) => {
        setKanbanStudentsMap(prev => ({ ...prev, [stageId]: items }));
    }, []);

    // Build baseParams for columns
    const kanbanBaseParams = React.useMemo(() => {
        const params = {};
        if (viewMode === 'my_work' && isHeadOrAdmin) {
            params.cs_agent_id = user.id;
        }
        if (filterCSAgent !== 'all') {
            params.cs_agent_id = filterCSAgent;
        }
        return params;
    }, [viewMode, isHeadOrAdmin, user?.id, filterCSAgent]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const baseParams = {};
            if (viewMode === 'my_work' && isHeadOrAdmin) {
                baseParams.cs_agent_id = user.id;
            }
            if (filterCSAgent !== 'all') {
                baseParams.cs_agent_id = filterCSAgent;
            }
            // Only apply period filter for Kanban/LTV views, not Table view
            if (csPeriodFilter && !searchTerm && displayMode !== 'table') {
                baseParams.date_from = csPeriodFilter.date_from;
                baseParams.date_to = csPeriodFilter.date_to;
                baseParams.date_field = 'upgrade_date';
            }

            // For Kanban mode: columns fetch their own data independently
            if (!searchTerm && !csPeriodFilter && !ltvSort && displayMode === 'kanban') {
                // Just set loading false — columns handle their own fetching
                setLoading(false);
                return;
            } else {
                // Search, period filter, LTV sort, or Table mode: use single paginated query
                const params = { ...baseParams, search: searchTerm || undefined, page: currentPage, page_size: pageSize };
                if (ltvSort) {
                    params.sort_by = 'ltv';
                    params.sort_order = ltvSort;
                    params.page_size = 100;
                }
                // Apply stage filter in table mode
                if (displayMode === 'table' && tableStageFilter && tableStageFilter !== 'all') {
                    params.stage = tableStageFilter;
                }
                const response = await studentApi.getAll(params);
                const data = response.data;
                const items = data?.items || (Array.isArray(data) ? data : []);
                setStudents(items);
                setTotalRecords(data?.total || items.length);
                setTotalPages(data?.total_pages || 0);
                if (viewMode === 'team' && isHeadOrAdmin) {
                    const agentMap = {};
                    items.forEach(s => {
                        const key = s.cs_agent_id || 'unassigned';
                        if (!agentMap[key]) agentMap[key] = { id: key, name: s.cs_agent_name || 'Unassigned', count: 0 };
                        agentMap[key].count++;
                    });
                    setTeamAgents(Object.values(agentMap).sort((a, b) => b.count - a.count));
                }
            }
        } catch (error) {
            toast.error('Failed to fetch students');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStageSummary = async () => {
        try {
            const params = new URLSearchParams();
            if (filterCSAgent !== 'all') params.set('cs_agent_id', filterCSAgent);
            if (viewMode === 'my_work' && isHeadOrAdmin) params.set('cs_agent_id', user.id);
            if (csPeriodFilter) {
                params.set('date_from', csPeriodFilter.date_from);
                params.set('date_to', csPeriodFilter.date_to);
            }
            const res = await apiClient.get(`/students/stage-summary?${params.toString()}`);
            setStageSummary(res.data);
        } catch { /* silent */ }
    };

    const fetchShadowCards = async () => {
        try {
            const params = new URLSearchParams();
            if (filterCSAgent !== 'all') params.set('cs_agent_id', filterCSAgent);
            if (viewMode === 'my_work' && isHeadOrAdmin) params.set('cs_agent_id', user.id);
            if (csPeriodFilter) {
                params.set('date_from', csPeriodFilter.date_from);
                params.set('date_to', csPeriodFilter.date_to);
            }
            params.set('page_size', '100');
            const res = await apiClient.get(`/students/upgrade-shadows?${params.toString()}`);
            setShadowCards(res.data?.items || []);
        } catch { setShadowCards([]); }
    };

    const handleColorTag = async (student, tag) => {
        try {
            await apiClient.patch(`/students/${student.student_id || student.id}/color-tag`, { color_tag: tag });
            toast.success(tag ? `Tagged as "${COLOR_TAGS.find(t => t.id === tag)?.label}"` : 'Tag removed');
            fetchStudents();
            fetchShadowCards();
        } catch (e) {
            toast.error('Failed to set color tag');
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    // Trigger fetch when searchTerm changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchStudents();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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

    const handleQuickReassignCS = async (student, agent) => {
        try {
            await studentApi.update(student.id, {
                cs_agent_id: agent.id,
                cs_agent_name: agent.full_name,
            });
            toast.success(`Reassigned to ${agent.full_name}`);
            fetchStudents();
        } catch (e) {
            console.error(e);
            toast.error('Failed to reassign');
        }
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
                <div className="flex items-center gap-3 flex-wrap">
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
                    {isSuperAdmin && csAgentsList.length > 0 && (
                        <Select value={filterCSAgent} onValueChange={setFilterCSAgent} data-testid="filter-cs-agent">
                            <SelectTrigger className="w-[160px] h-9 text-xs" data-testid="filter-cs-agent-trigger">
                                <SelectValue placeholder="All Agents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Agents</SelectItem>
                                {csAgentsList.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    <PeriodFilter
                        dateFields={[{ value: 'upgrade_date', label: 'Upgrade Date' }]}
                        onChange={setCsPeriodFilter}
                        defaultPeriod="this_month"
                    />
                    {['super_admin', 'admin', 'cs_head'].includes(user?.role) && (
                        <>
                            <ImportButton templateType="students_cs" title="Import Students" onSuccess={fetchStudents} />
                            <Button variant="outline" size="sm" data-testid="migrate-students-btn"
                                onClick={async () => {
                                    if (!window.confirm('This will move all activated students WITHOUT a completed activation questionnaire back to "New Student" stage. Continue?')) return;
                                    try {
                                        const res = await apiClient.post('/students/migrate-to-new-student');
                                        toast.success(res.data.message);
                                        fetchStudents();
                                    } catch (err) {
                                        toast.error('Migration failed: ' + (err.response?.data?.detail || err.message));
                                    }
                                }}>
                                <RefreshCw className="h-4 w-4 mr-1.5" />Migrate Historic Data
                            </Button>
                        </>
                    )}
                    {isSuperAdmin && (
                        <Button variant="outline" size="sm" data-testid="export-students-btn"
                            onClick={() => {
                                const API_URL = process.env.REACT_APP_BACKEND_URL || '';
                                const token = localStorage.getItem('clt_token');
                                window.open(`${API_URL}/api/students/export/excel?token=${token}`, '_blank');
                            }}>
                            <Download className="h-4 w-4 mr-1.5" />Export All
                        </Button>
                    )}
                </div>
            </div>

            {/* View Mode Toggle for CS Head / Admin */}
            {isHeadOrAdmin && (
                <div className="flex items-center gap-3" data-testid="cs-view-toggle">
                    <div className="inline-flex rounded-lg border p-1 bg-muted/30">
                        <button
                            onClick={() => setViewMode('my_work')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'my_work' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            data-testid="cs-view-my-work"
                        >
                            My Students
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            data-testid="cs-view-team"
                        >
                            Team Overview
                        </button>
                    </div>
                    {viewMode === 'team' && teamAgents.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {teamAgents.map(agent => (
                                <Badge key={agent.id} variant="secondary" className="text-xs">
                                    {agent.name}: {agent.count}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Summary Status Bar */}
            {stageSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2" data-testid="cs-summary-bar">
                    {CS_STAGES.map(stage => {
                        const count = stageSummary.stage_counts?.[stage.id] || 0;
                        return (
                            <div key={stage.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-muted-foreground truncate">{stage.label}</p>
                                    <p className="text-sm font-bold">{count}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                        <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">Total</p>
                            <p className="text-sm font-bold">{stageSummary.total_students}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30">
                        <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">Period Revenue</p>
                            <p className="text-sm font-bold text-emerald-600">AED {(stageSummary.period_revenue || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setLtvSort(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${ltvSort ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/30 ring-1 ring-indigo-400' : 'bg-card hover:bg-muted/50'}`}
                        data-testid="ltv-sort-toggle"
                    >
                        <TrendingUp className={`h-4 w-4 shrink-0 ${ltvSort ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">LTV Sort</p>
                            <p className={`text-sm font-bold ${ltvSort ? 'text-indigo-600' : 'text-muted-foreground'}`}>
                                {ltvSort === 'desc' ? 'High→Low' : ltvSort === 'asc' ? 'Low→High' : 'Off'}
                            </p>
                        </div>
                    </button>
                </div>
            )}

            {/* Kanban/Table Toggle + Display */}
            <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border p-1 bg-muted/30" data-testid="cs-display-toggle">
                    <button
                        onClick={() => { setDisplayMode('kanban'); setLtvSort(null); }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${displayMode === 'kanban' && !ltvSort ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        data-testid="cs-kanban-toggle"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Kanban
                    </button>
                    <button
                        onClick={() => { setDisplayMode('table'); setLtvSort(null); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${displayMode === 'table' && !ltvSort ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        data-testid="cs-table-toggle"
                    >
                        <List className="h-3.5 w-3.5" />
                        Table
                    </button>
                </div>

                {/* Stage filter — visible in Table mode */}
                {(displayMode === 'table' || ltvSort) && (
                    <Select value={tableStageFilter} onValueChange={(v) => { setTableStageFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="table-stage-filter">
                            <SelectValue placeholder="Filter by Stage" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {CS_STAGES.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    <span className="flex items-center gap-2">
                                        <span className={`inline-block w-2 h-2 rounded-full ${s.color}`} />
                                        {s.label} {stageSummary?.stage_counts?.[s.id] != null ? `(${stageSummary.stage_counts[s.id]})` : ''}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : ltvSort || displayMode === 'table' ? (
                /* Table / LTV Sorted List */
                <div className="border rounded-lg overflow-hidden" data-testid="cs-table-view">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Student</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Enrollment</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => setLtvSort(prev => !prev ? 'desc' : prev === 'desc' ? 'asc' : null)}>
                                    <span className="inline-flex items-center gap-1">
                                        LTV {ltvSort === 'desc' ? <ArrowUp className="h-3 w-3 rotate-180" /> : ltvSort === 'asc' ? <ArrowUp className="h-3 w-3" /> : null}
                                    </span>
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tag</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">CS Agent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {students.map((s, idx) => {
                                const stageObj = CS_STAGES.find(st => st.id === s.stage);
                                const colorTag = getColorTagStyle(s.color_tag);
                                return (
                                    <tr key={s.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleViewStudent(s)} data-testid={`table-row-${s.id}`}>
                                        <td className="px-4 py-2.5 text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                                        <td className="px-4 py-2.5 font-medium">{s.full_name}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">{s.phone}</td>
                                        <td className="px-4 py-2.5">
                                            {stageObj ? (
                                                <Badge className={`${stageObj.color} text-white text-[10px]`}>{stageObj.label}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px]">{s.stage}</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.course_level || s.current_course_name || s.package_bought || '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">AED {(s.enrollment_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600">AED {(s.ltv || s.enrollment_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-2.5">
                                            {colorTag && (
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${colorTag.color}`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${colorTag.dot}`} />
                                                    {colorTag.label}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.cs_agent_name || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {students.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">No students found</div>
                    )}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-3" style={{ minHeight: 'calc(100vh - 280px)' }} data-testid="cs-kanban-board">
                        {CS_STAGES.map((stage) => (
                            <KanbanColumn
                                key={stage.id}
                                stage={stage}
                                baseParams={kanbanBaseParams}
                                shadowCards={stage.id === 'upgraded' ? shadowCards : []}
                                onView={handleViewStudent}
                                onSetReminder={handleSetReminder}
                                onInitiateUpgrade={handleInitiateUpgrade}
                                isSuperAdmin={isSuperAdmin}
                                csAgents={csAgentsList}
                                onQuickReassign={handleQuickReassignCS}
                                onColorTag={handleColorTag}
                                stageTotal={stageSummary?.stage_counts?.[stage.id] || 0}
                                onStudentsFetched={handleColumnStudentsFetched}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <StudentCard
                                student={allKanbanStudents.find(s => s.id === activeId) || students.find(s => s.id === activeId)}
                                onView={() => {}}
                                onSetReminder={() => {}}
                                onInitiateUpgrade={() => {}}
                                isDragging={true}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Pagination — only for table/search/LTV mode */}
            {!loading && students.length > 0 && (displayMode === 'table' || ltvSort || searchTerm) && (
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
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="ml-auto text-xs gap-1"
                                                    data-testid="merge-student-btn"
                                                    onClick={() => {
                                                        setMergeStudent(selectedStudent);
                                                        setShowMergeModal(true);
                                                    }}
                                                >
                                                    <GitMerge className="h-3.5 w-3.5" />
                                                    Merge
                                                </Button>
                                            </div>
                                            {/* Color Tag Picker */}
                                            <div className="flex items-center gap-2 mt-3 flex-wrap" data-testid="color-tag-picker">
                                                <span className="text-xs text-muted-foreground mr-1"><Palette className="h-3 w-3 inline mr-1" />Tag:</span>
                                                {COLOR_TAGS.map(tag => (
                                                    <button
                                                        key={tag.id}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all ${selectedStudent.color_tag === tag.id ? tag.color + ' ring-2 ring-offset-1 ring-current font-bold' : 'border-muted text-muted-foreground hover:border-foreground'}`}
                                                        onClick={() => handleColorTag(selectedStudent, selectedStudent.color_tag === tag.id ? null : tag.id)}
                                                        data-testid={`color-tag-btn-${tag.id}`}
                                                    >
                                                        <div className={`h-2 w-2 rounded-full ${tag.dot}`} />
                                                        {tag.label}
                                                    </button>
                                                ))}
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
                            
                            {/* Customer Transaction History */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                        Transaction History
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <TransactionHistory studentId={selectedStudent.id} />
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

            {/* Student Merge Modal */}
            <MergeStudentModal
                open={showMergeModal}
                onClose={() => { setShowMergeModal(false); setMergeStudent(null); }}
                student={mergeStudent}
                onMergeSubmitted={() => {
                    setShowMergeModal(false);
                    setMergeStudent(null);
                    setShowDetailModal(false);
                    fetchStudents();
                }}
            />
        </div>
    );
};

export default CustomerServicePage;
