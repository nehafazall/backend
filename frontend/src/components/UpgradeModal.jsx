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
    'starter': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', label: 'Starter' },
    'basic': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', label: 'Basic' },
    'intermediate': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Intermediate' },
    'advanced': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', label: 'Advanced' },
    'mastery': { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white', label: 'Mastery' },
};

export const getCourseColor = (courseName) => {
    if (!courseName) return COURSE_COLORS.starter;
    const name = courseName.toLowerCase();
    if (name.includes('mastery')) return COURSE_COLORS.mastery;
    if (name.includes('advanced')) return COURSE_COLORS.advanced;
    if (name.includes('intermediate')) return COURSE_COLORS.intermediate;
    if (name.includes('basic')) return COURSE_COLORS.basic;
    return COURSE_COLORS.starter;
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
