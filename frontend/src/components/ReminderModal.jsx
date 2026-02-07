import React, { useState } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Bell, Calendar, Clock } from 'lucide-react';

function ReminderModal({ open, onClose, entityType, entityId, entityName, onSuccess }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [note, setNote] = useState('');
    const [reminderType, setReminderType] = useState('general');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!date) {
            toast.error('Please select a date');
            return;
        }
        
        setSaving(true);
        try {
            const endpoint = entityType === 'lead'
                ? '/leads/' + entityId + '/reminder'
                : '/students/' + entityId + '/reminder';
            
            const params = new URLSearchParams();
            params.append('reminder_date', date);
            params.append('reminder_time', time || '09:00');
            params.append('reminder_note', note);
            if (entityType === 'student') {
                params.append('reminder_type', reminderType);
            }
            
            await apiClient.post(endpoint + '?' + params.toString());
            toast.success('Reminder set for ' + date);
            
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            toast.error('Failed to set reminder');
        }
        setSaving(false);
    }

    function handleClose() {
        setDate('');
        setTime('');
        setNote('');
        setReminderType('general');
        onClose();
    }

    function setQuickDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Set Reminder
                    </DialogTitle>
                    <DialogDescription>
                        Remind me to follow up with {entityName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={function() { setQuickDate(1); }}>Tomorrow</Button>
                        <Button variant="outline" size="sm" onClick={function() { setQuickDate(3); }}>In 3 days</Button>
                        <Button variant="outline" size="sm" onClick={function() { setQuickDate(7); }}>In 1 week</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />Date *
                            </Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={function(e) { setDate(e.target.value); }}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />Time
                            </Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={function(e) { setTime(e.target.value); }}
                            />
                        </div>
                    </div>

                    {entityType === 'student' && (
                        <div className="space-y-2">
                            <Label>Reminder Type</Label>
                            <Select value={reminderType} onValueChange={setReminderType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General Follow-up</SelectItem>
                                    <SelectItem value="upgrade">Upgrade Call</SelectItem>
                                    <SelectItem value="redeposit">Redeposit Call</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Note (optional)</Label>
                        <Textarea
                            value={note}
                            onChange={function(e) { setNote(e.target.value); }}
                            placeholder="What should you discuss?"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving || !date}>
                        {saving ? 'Saving...' : 'Set Reminder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ReminderModal;
