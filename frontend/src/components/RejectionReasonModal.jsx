import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { XCircle, AlertTriangle } from 'lucide-react';

const REJECTION_REASONS = [
    { id: 'not_interested', label: 'Not Interested', description: 'Lead is not interested in the course' },
    { id: 'budget_constraints', label: 'Budget Constraints', description: 'Cannot afford the course at this time' },
    { id: 'wrong_timing', label: 'Wrong Timing', description: 'Not the right time, may revisit later' },
    { id: 'competitor', label: 'Chose Competitor', description: 'Enrolled with a different provider' },
    { id: 'no_response', label: 'No Response', description: 'Multiple attempts, no response received' },
    { id: 'invalid_lead', label: 'Invalid Lead', description: 'Wrong number, fake details, or spam' },
    { id: 'location_issue', label: 'Location Issue', description: 'Geographic or timezone constraints' },
    { id: 'other', label: 'Other', description: 'Other reason (specify below)' },
];

const RejectionReasonModal = ({ 
    open, 
    onClose, 
    lead,
    onComplete 
}) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!selectedReason) {
            setError('Please select a rejection reason');
            toast.error('Please select a rejection reason');
            return;
        }
        
        if (selectedReason === 'other' && !additionalNotes.trim()) {
            setError('Please provide details for "Other" reason');
            toast.error('Please provide details for the rejection reason');
            return;
        }
        
        const reasonLabel = REJECTION_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
        
        onComplete({
            rejection_reason: selectedReason,
            rejection_reason_label: reasonLabel,
            rejection_notes: additionalNotes,
        });
    };

    const handleClose = () => {
        setSelectedReason('');
        setAdditionalNotes('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg" data-testid="rejection-reason-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-red-500">
                        <XCircle className="h-6 w-6" />
                        Rejection Reason Required
                    </DialogTitle>
                    <DialogDescription>
                        Please select a reason for rejecting <strong>{lead?.full_name}</strong>. 
                        This helps improve lead quality and sales processes.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            Select Rejection Reason *
                        </Label>
                        <RadioGroup 
                            value={selectedReason}
                            onValueChange={(v) => {
                                setSelectedReason(v);
                                setError('');
                            }}
                            className="space-y-2"
                        >
                            {REJECTION_REASONS.map((reason) => {
                                const isSelected = selectedReason === reason.id;
                                return (
                                    <div 
                                        key={reason.id}
                                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'border-red-500 bg-red-500/10' 
                                                : 'border-border hover:border-red-500/50'
                                        }`}
                                        onClick={() => {
                                            setSelectedReason(reason.id);
                                            setError('');
                                        }}
                                    >
                                        <RadioGroupItem value={reason.id} id={reason.id} className="mt-0.5" />
                                        <div>
                                            <Label 
                                                htmlFor={reason.id} 
                                                className={`font-medium cursor-pointer ${isSelected ? 'text-red-600' : ''}`}
                                            >
                                                {reason.label}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">{reason.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                        {error && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Additional Notes 
                            {selectedReason === 'other' && <span className="text-red-500"> *</span>}
                        </Label>
                        <Textarea
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            placeholder={selectedReason === 'other' 
                                ? "Please specify the rejection reason..." 
                                : "Any additional context (optional)..."
                            }
                            rows={3}
                            data-testid="rejection-notes-input"
                        />
                    </div>
                </div>

                <DialogFooter className="flex gap-2 border-t pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        variant="destructive"
                        data-testid="confirm-rejection-btn"
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        Confirm Rejection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RejectionReasonModal;
