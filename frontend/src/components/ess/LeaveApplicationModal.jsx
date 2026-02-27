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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Upload, FileText, AlertCircle } from 'lucide-react';

const LeaveApplicationModal = ({ isOpen, onClose, onSuccess }) => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        half_day_type: null,
        document_url: null,
    });
    
    const [selectedLeaveType, setSelectedLeaveType] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchLeaveTypes();
        }
    }, [isOpen]);

    const fetchLeaveTypes = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/ess/leave-types');
            setLeaveTypes(res.data);
        } catch (error) {
            toast.error('Failed to load leave types');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveTypeChange = (value) => {
        setFormData({ ...formData, leave_type: value });
        const selected = leaveTypes.find(lt => lt.id === value);
        setSelectedLeaveType(selected);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.leave_type || !formData.start_date || !formData.reason) {
            toast.error('Please fill in all required fields');
            return;
        }
        
        // For half day, end_date = start_date
        const endDate = formData.leave_type === 'half_day' 
            ? formData.start_date 
            : formData.end_date;
        
        if (!endDate) {
            toast.error('Please select an end date');
            return;
        }
        
        // Check if document is required
        if (selectedLeaveType?.requires_document && !formData.document_url) {
            toast.error(`${selectedLeaveType.name} requires a supporting document`);
            return;
        }
        
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                end_date: endDate,
            };
            
            await apiClient.post('/ess/leave-requests', payload);
            toast.success('Leave request submitted successfully');
            onSuccess?.();
            onClose();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit leave request');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            leave_type: '',
            start_date: '',
            end_date: '',
            reason: '',
            half_day_type: null,
            document_url: null,
        });
        setSelectedLeaveType(null);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // For now, we'll use a placeholder. In production, this would upload to cloud storage
        // and return the URL
        toast.info('Document upload feature - URL will be stored');
        setFormData({ ...formData, document_url: `uploaded:${file.name}` });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]" data-testid="leave-application-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Apply for Leave
                    </DialogTitle>
                    <DialogDescription>
                        Submit a leave request for approval
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Leave Type */}
                    <div className="space-y-2">
                        <Label>Leave Type *</Label>
                        <Select 
                            value={formData.leave_type} 
                            onValueChange={handleLeaveTypeChange}
                        >
                            <SelectTrigger data-testid="leave-type-select">
                                <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                                {leaveTypes.map((lt) => (
                                    <SelectItem key={lt.id} value={lt.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{lt.name}</span>
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                {lt.days_per_year === -1 ? '∞' : lt.days_per_year} days/year
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedLeaveType?.full_time_only && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Available for full-time employees only
                            </p>
                        )}
                    </div>
                    
                    {/* Half Day Type (if half day selected) */}
                    {formData.leave_type === 'half_day' && (
                        <div className="space-y-2">
                            <Label>Half Day Type *</Label>
                            <Select 
                                value={formData.half_day_type || ''} 
                                onValueChange={(v) => setFormData({ ...formData, half_day_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select half day type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="first_half">First Half (Morning)</SelectItem>
                                    <SelectItem value="second_half">Second Half (Afternoon)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    {/* Date Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date *</Label>
                            <Input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                data-testid="leave-start-date"
                            />
                        </div>
                        {formData.leave_type !== 'half_day' && (
                            <div className="space-y-2">
                                <Label>End Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                                    data-testid="leave-end-date"
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Textarea
                            placeholder="Please provide a reason for your leave request..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={3}
                            data-testid="leave-reason"
                        />
                    </div>
                    
                    {/* Document Upload */}
                    {selectedLeaveType?.requires_document && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                Supporting Document *
                                <span className="text-xs text-muted-foreground">(Medical certificate, etc.)</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileUpload}
                                    className="flex-1"
                                />
                            </div>
                            {formData.document_url && (
                                <p className="text-xs text-emerald-600 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Document attached
                                </p>
                            )}
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} data-testid="submit-leave-btn">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default LeaveApplicationModal;
