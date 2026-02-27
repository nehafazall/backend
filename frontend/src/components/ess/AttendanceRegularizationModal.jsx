import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, ArrowRight } from 'lucide-react';

const AttendanceRegularizationModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    attendanceRecord // Pre-filled if clicking on a specific date
}) => {
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        date: '',
        requested_check_in: '',
        requested_check_out: '',
        reason: '',
    });

    useEffect(() => {
        if (attendanceRecord) {
            setFormData({
                date: attendanceRecord.date || '',
                requested_check_in: attendanceRecord.biometric_in || '',
                requested_check_out: attendanceRecord.biometric_out || '',
                reason: '',
            });
        }
    }, [attendanceRecord]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.date || !formData.requested_check_in || !formData.requested_check_out || !formData.reason) {
            toast.error('Please fill in all fields');
            return;
        }
        
        setSubmitting(true);
        try {
            await apiClient.post('/ess/attendance-regularization', formData);
            toast.success('Regularization request submitted successfully');
            onSuccess?.();
            onClose();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            date: '',
            requested_check_in: '',
            requested_check_out: '',
            reason: '',
        });
    };

    const originalIn = attendanceRecord?.biometric_in;
    const originalOut = attendanceRecord?.biometric_out;
    const hasChanges = (originalIn !== formData.requested_check_in) || 
                       (originalOut !== formData.requested_check_out);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]" data-testid="regularization-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Attendance Regularization
                    </DialogTitle>
                    <DialogDescription>
                        Request to correct your attendance record
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date Selection */}
                    <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            data-testid="reg-date"
                        />
                    </div>
                    
                    {/* Original Times (if available) */}
                    {(originalIn || originalOut) && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <Label className="text-xs text-muted-foreground mb-2 block">Original Record</Label>
                            <div className="flex items-center gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">In: </span>
                                    <span className="font-mono">{originalIn || '--:--'}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <span className="text-muted-foreground">Out: </span>
                                    <span className="font-mono">{originalOut || '--:--'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Requested Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Check-In Time *</Label>
                            <Input
                                type="time"
                                value={formData.requested_check_in}
                                onChange={(e) => setFormData({ ...formData, requested_check_in: e.target.value })}
                                data-testid="reg-check-in"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Check-Out Time *</Label>
                            <Input
                                type="time"
                                value={formData.requested_check_out}
                                onChange={(e) => setFormData({ ...formData, requested_check_out: e.target.value })}
                                data-testid="reg-check-out"
                            />
                        </div>
                    </div>
                    
                    {/* Show change indicator */}
                    {hasChanges && (
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>You are changing the recorded times. A reason is required.</span>
                        </div>
                    )}
                    
                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Reason for Regularization *</Label>
                        <Textarea
                            placeholder="Please explain why you need to regularize your attendance (e.g., forgot to punch, system error, worked from home, etc.)"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            data-testid="reg-reason"
                        />
                    </div>
                    
                    {/* Approval Info */}
                    <div className="p-3 bg-blue-500/10 rounded-lg text-sm">
                        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Approval Required</p>
                        <p className="text-xs text-muted-foreground">
                            Your request will be sent to: Manager → HR → CEO for approval
                        </p>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} data-testid="submit-reg-btn">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceRegularizationModal;
