import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Wallet, CreditCard, History, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Course color mapping
export const COURSE_COLORS = {
    'starter': { bg: 'bg-sky-100 dark:bg-sky-900/30', border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-700 dark:text-sky-300', label: 'Starter', next: 'Basic' },
    'basic': { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-300', label: 'Basic', next: 'Intermediate' },
    'intermediate': { bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-300', label: 'Intermediate', next: 'Advanced' },
    'advanced': { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300', label: 'Advanced', next: 'Mastery' },
    'mastery': { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', label: 'Mastery', next: null },
};

export const getCourseColor = (courseNameOrLevel) => {
    if (!courseNameOrLevel) return COURSE_COLORS.starter;
    const name = courseNameOrLevel.toLowerCase();
    // Direct level match first
    if (COURSE_COLORS[name]) return COURSE_COLORS[name];
    // Then substring match for course names
    if (name.includes('mastery')) return COURSE_COLORS.mastery;
    if (name.includes('advanced') || name.includes('advance')) return COURSE_COLORS.advanced;
    if (name.includes('intermediate')) return COURSE_COLORS.intermediate;
    if (name.includes('basic')) return COURSE_COLORS.basic;
    if (name.includes('starter')) return COURSE_COLORS.starter;
    return COURSE_COLORS.starter;
};

// Course level ordering for upgrade path visualization
const COURSE_LEVELS = [
    { key: 'starter', label: 'Starter', icon: '🌱' },
    { key: 'basic', label: 'Basic', icon: '📘' },
    { key: 'intermediate', label: 'Intermediate', icon: '📚' },
    { key: 'advanced', label: 'Advanced', icon: '🎓' },
    { key: 'mastery', label: 'Mastery', icon: '👑' }
];

// Get course level index from course name
const getCourseLevel = (courseName) => {
    if (!courseName) return 0;
    const name = courseName.toLowerCase();
    if (name.includes('mastery')) return 4;
    if (name.includes('advanced')) return 3;
    if (name.includes('intermediate')) return 2;
    if (name.includes('basic')) return 1;
    return 0; // starter
};

// Visual Upgrade Path Indicator Component
export const UpgradePathIndicator = ({ 
    currentCourse, 
    upgradeHistory = [], 
    compact = false,
    showHistory = true 
}) => {
    const currentLevel = getCourseLevel(currentCourse);
    
    if (compact) {
        return (
            <div className="flex items-center gap-1">
                {COURSE_LEVELS.map((level, idx) => {
                    const isCompleted = idx < currentLevel;
                    const isCurrent = idx === currentLevel;
                    const color = COURSE_COLORS[level.key];
                    
                    return (
                        <React.Fragment key={level.key}>
                            <div 
                                className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                                    transition-all duration-300
                                    ${isCompleted ? `${color.bg} ${color.text}` : ''}
                                    ${isCurrent ? `${color.bg} ${color.border} border-2 ${color.text} ring-2 ring-offset-1 ring-${level.key === 'mastery' ? 'emerald' : level.key}-400` : ''}
                                    ${!isCompleted && !isCurrent ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : ''}
                                `}
                                title={level.label}
                            >
                                {isCompleted ? '✓' : isCurrent ? level.icon : (idx + 1)}
                            </div>
                            {idx < COURSE_LEVELS.length - 1 && (
                                <div className={`w-3 h-0.5 ${idx < currentLevel ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    }
    
    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Upgrade Journey
                </h4>
                {upgradeHistory?.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        {upgradeHistory.length} Upgrade{upgradeHistory.length > 1 ? 's' : ''}
                    </Badge>
                )}
            </div>
            
            {/* Progress Path */}
            <div className="relative flex items-center justify-between mb-4 py-2">
                {/* Progress Line Background */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 rounded-full" />
                
                {/* Progress Line Filled */}
                <div 
                    className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentLevel / (COURSE_LEVELS.length - 1)) * 100}%` }}
                />
                
                {/* Level Nodes */}
                {COURSE_LEVELS.map((level, idx) => {
                    const isCompleted = idx < currentLevel;
                    const isCurrent = idx === currentLevel;
                    const color = COURSE_COLORS[level.key];
                    
                    return (
                        <div key={level.key} className="relative z-10 flex flex-col items-center">
                            <div 
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                    transition-all duration-300 shadow-sm
                                    ${isCompleted ? `${color.bg} ${color.text} ${color.border} border-2` : ''}
                                    ${isCurrent ? `${color.bg} ${color.text} ${color.border} border-3 ring-4 ring-offset-2 ring-${level.key === 'mastery' ? 'emerald' : level.key}-200 scale-110` : ''}
                                    ${!isCompleted && !isCurrent ? 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-400' : ''}
                                `}
                            >
                                {isCompleted ? '✓' : level.icon}
                            </div>
                            <span className={`
                                mt-2 text-xs font-medium
                                ${isCurrent ? `${color.text} font-bold` : ''}
                                ${isCompleted ? 'text-emerald-600' : ''}
                                ${!isCompleted && !isCurrent ? 'text-slate-400' : ''}
                            `}>
                                {level.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {/* Upgrade History */}
            {showHistory && upgradeHistory?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                        <History className="h-3 w-3" />
                        Upgrade History
                    </h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {upgradeHistory.map((upgrade, idx) => {
                            const fromColor = getCourseColor(upgrade.from_course);
                            const toColor = getCourseColor(upgrade.to_course);
                            const upgradeDate = upgrade.upgraded_at ? new Date(upgrade.upgraded_at).toLocaleDateString() : 'N/A';
                            
                            return (
                                <div key={idx} className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-slate-100 dark:border-slate-700">
                                    <Badge className={`${fromColor.bg} ${fromColor.text} text-[10px] px-1.5`}>
                                        {upgrade.from_course || 'Initial'}
                                    </Badge>
                                    <span className="text-emerald-500">→</span>
                                    <Badge className={`${toColor.bg} ${toColor.text} text-[10px] px-1.5`}>
                                        {upgrade.to_course}
                                    </Badge>
                                    <span className="text-slate-400 ml-auto">{upgradeDate}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* Next Upgrade Hint */}
            {currentLevel < COURSE_LEVELS.length - 1 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="text-emerald-500">💡</span>
                        Next level: <span className="font-medium text-slate-700 dark:text-slate-300">{COURSE_LEVELS[currentLevel + 1]?.label}</span>
                    </p>
                </div>
            )}
            
            {/* Mastery Achievement */}
            {currentLevel === COURSE_LEVELS.length - 1 && (
                <div className="mt-3 pt-3 border-t border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 -mx-1">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                        <span>🏆</span>
                        Congratulations! You've reached Mastery level!
                    </p>
                </div>
            )}
        </div>
    );
};

const UpgradeModal = ({ isOpen, onClose, student, onUpgradeComplete }) => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        upgrade_course_id: '',
        mt5_account_changed: false,
        new_mt5_account: '',
        wallet_transfer_confirmed: false,
        notes: ''
    });

    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchCourses();
            // Reset form
            setFormData({
                upgrade_course_id: '',
                mt5_account_changed: false,
                new_mt5_account: '',
                wallet_transfer_confirmed: false,
                notes: ''
            });
            setSelectedCourse(null);
        }
    }, [isOpen]);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('clt_token');
            const res = await fetch(`${API_URL}/api/courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            toast.error('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        setSelectedCourse(course);
        setFormData(prev => ({ ...prev, upgrade_course_id: courseId }));
    };

    const handleSubmit = async () => {
        if (!formData.upgrade_course_id) {
            toast.error('Please select a course for upgrade');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('clt_token');
            const params = new URLSearchParams({
                upgrade_course_id: formData.upgrade_course_id,
                mt5_account_changed: formData.mt5_account_changed,
                wallet_transfer_confirmed: formData.wallet_transfer_confirmed
            });
            
            if (formData.mt5_account_changed && formData.new_mt5_account) {
                params.append('new_mt5_account', formData.new_mt5_account);
            }
            if (formData.notes) {
                params.append('notes', formData.notes);
            }

            const res = await fetch(`${API_URL}/api/students/${student.id}/initiate-upgrade?${params}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Upgrade initiated to ${selectedCourse?.name}`);
                onUpgradeComplete(data.student);
                onClose();
            } else {
                const error = await res.json();
                toast.error(error.detail || 'Failed to initiate upgrade');
            }
        } catch (error) {
            toast.error('Failed to initiate upgrade');
        } finally {
            setSubmitting(false);
        }
    };

    const currentCourse = student?.current_course_name || student?.package_bought || 'N/A';
    const currentMT5 = student?.mt5_account_number || 
                       student?.activation_questionnaire?.trading_account_number || 
                       'Not set';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Initiate Upgrade - {student?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        Process course upgrade for an existing student. Previous questionnaire data will be preserved.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Current Status */}
                    <Card className="bg-muted/30">
                        <CardContent className="p-4">
                            <h4 className="text-sm font-semibold mb-3">Current Status</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Current Course:</span>
                                    <Badge className={`ml-2 ${getCourseColor(currentCourse).bg} ${getCourseColor(currentCourse).text}`}>
                                        {currentCourse}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">MT5 Account:</span>
                                    <span className="ml-2 font-mono">{currentMT5}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Upgrade Count:</span>
                                    <span className="ml-2 font-medium">{student?.upgrade_count || 0}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Mentor:</span>
                                    <span className="ml-2">{student?.mentor_name || 'Not assigned'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Course Selection - MANDATORY */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Select Upgrade Course <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                            value={formData.upgrade_course_id} 
                            onValueChange={handleCourseSelect}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a course for upgrade" />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map(course => {
                                    const colors = getCourseColor(course.name);
                                    return (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}></div>
                                                <span>{course.name}</span>
                                                <span className="text-muted-foreground">- AED {(course.price || course.base_price)?.toLocaleString()}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Selected Course Details */}
                    {selectedCourse && (
                        <Card className={`${getCourseColor(selectedCourse.name).bg} ${getCourseColor(selectedCourse.name).border} border-2`}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className={`font-semibold ${getCourseColor(selectedCourse.name).text}`}>
                                            {selectedCourse.name}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">AED {(selectedCourse.price || selectedCourse.base_price)?.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Upgrade Amount</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* MT5 Account */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="mt5_changed"
                                checked={formData.mt5_account_changed}
                                onCheckedChange={(checked) => setFormData(prev => ({ 
                                    ...prev, 
                                    mt5_account_changed: checked,
                                    new_mt5_account: checked ? prev.new_mt5_account : ''
                                }))}
                            />
                            <Label htmlFor="mt5_changed" className="cursor-pointer">
                                MT5 Account has changed
                            </Label>
                        </div>
                        
                        {formData.mt5_account_changed && (
                            <div className="pl-6">
                                <Label>New MT5 Account Number</Label>
                                <Input
                                    value={formData.new_mt5_account}
                                    onChange={(e) => setFormData(prev => ({ ...prev, new_mt5_account: e.target.value }))}
                                    placeholder="Enter new MT5 account number"
                                    className="mt-1"
                                />
                            </div>
                        )}
                    </div>

                    {/* Wallet Transfer Confirmation */}
                    <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <Checkbox 
                            id="wallet_transfer"
                            checked={formData.wallet_transfer_confirmed}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, wallet_transfer_confirmed: checked }))}
                        />
                        <Label htmlFor="wallet_transfer" className="cursor-pointer flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-amber-500" />
                            Wallet amount transfer confirmed
                        </Label>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add any notes about this upgrade..."
                            rows={2}
                        />
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-800">What happens next:</p>
                            <ul className="text-blue-700 mt-1 list-disc list-inside">
                                <li>Student moves back to "New Student" stage for re-activation</li>
                                <li>Previous questionnaire data will be pre-filled</li>
                                <li>Student stays with the same mentor (marked as upgrade)</li>
                                <li>Will NOT count as a new student for mentor metrics</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting || !formData.upgrade_course_id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {submitting ? 'Processing...' : 'Initiate Upgrade'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Upgrade History Component
export const UpgradeHistoryCard = ({ student }) => {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [student?.id]);

    const fetchHistory = async () => {
        if (!student?.id) return;
        try {
            const token = localStorage.getItem('clt_token');
            const res = await fetch(`${API_URL}/api/students/${student.id}/upgrade-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error('Failed to fetch upgrade history');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-20 bg-muted rounded"></div>;
    if (!history || history.upgrade_count === 0) return null;

    return (
        <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-emerald-500" />
                    <h4 className="font-semibold text-sm">Upgrade History</h4>
                    <Badge variant="secondary">{history.upgrade_count} upgrade(s)</Badge>
                </div>
                
                <div className="space-y-2">
                    {history.upgrade_history?.map((upgrade, idx) => (
                        <div key={upgrade.id || idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                            <div className="flex items-center gap-2">
                                <Badge className={`${getCourseColor(upgrade.from_course_name).bg} ${getCourseColor(upgrade.from_course_name).text}`}>
                                    {upgrade.from_course_name || 'Initial'}
                                </Badge>
                                <span>→</span>
                                <Badge className={`${getCourseColor(upgrade.to_course_name).bg} ${getCourseColor(upgrade.to_course_name).text}`}>
                                    {upgrade.to_course_name}
                                </Badge>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">AED {upgrade.to_amount?.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(upgrade.initiated_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Spent on Upgrades:</span>
                    <span className="font-bold text-emerald-600">AED {history.total_spent?.toLocaleString()}</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default UpgradeModal;
