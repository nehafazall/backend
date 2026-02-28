import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const EmployeeModal = ({ open, onOpenChange, employee, onSave }) => {
    const [saving, setSaving] = useState(false);
    const [opts, setOpts] = useState({ departments: [], roles: [], teams: [], managers: [] });
    const [f, setF] = useState({});

    useEffect(() => {
        if (open) api.get('/hr/employees/sync-options').then(r => setOpts(r.data)).catch(() => {});
    }, [open]);

    useEffect(() => {
        setF(employee || { employee_id: '', full_name: '', company_email: '', department: '', designation: '', role: '', joining_date: '', employment_status: 'probation', gender: '', create_user_account: true });
    }, [employee]);

    const set = (k, v) => setF(p => ({ ...p, [k]: v }));

    const save = async () => {
        setSaving(true);
        try {
            const isNew = !employee?.id;
            if (isNew && f.create_user_account) {
                await onSave({ ...f, create_user_account: true }, 'create-with-user');
            } else {
                await onSave(f, isNew ? 'create' : 'update');
            }
            onOpenChange(false);
        } catch (e) {}
        setSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>{employee?.id ? 'Edit' : 'Add'} Employee</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Employee ID *</Label><Input value={f.employee_id||''} onChange={e => set('employee_id', e.target.value)} /></div>
                        <div><Label>Full Name *</Label><Input value={f.full_name||''} onChange={e => set('full_name', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Company Email *</Label><Input type="email" value={f.company_email||''} onChange={e => set('company_email', e.target.value)} /></div>
                        <div><Label>Gender *</Label>
                            <Select value={f.gender||''} onValueChange={v => set('gender', v)}>
                                <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Department *</Label>
                            <Select value={f.department||''} onValueChange={v => set('department', v)}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{opts.departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div><Label>Designation *</Label><Input value={f.designation||''} onChange={e => set('designation', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>System Role *</Label>
                            <Select value={f.role||''} onValueChange={v => set('role', v)}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{opts.roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div><Label>Team</Label>
                            <Select value={f.team_id||'none'} onValueChange={v => set('team_id', v === 'none' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent><SelectItem value="none">None</SelectItem>{opts.teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><Label>Joining Date *</Label><Input type="date" value={f.joining_date||''} onChange={e => set('joining_date', e.target.value)} /></div>
                        <div><Label>Status</Label>
                            <Select value={f.employment_status||'probation'} onValueChange={v => set('employment_status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="probation">Probation</SelectItem><SelectItem value="resigned">Resigned</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    {!employee?.id && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded">
                            <Switch checked={f.create_user_account!==false} onCheckedChange={v => set('create_user_account', v)} />
                            <span className="text-sm">Create user account (auto-generates login)</span>
                        </div>
                    )}
                    {employee?.user_id && <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm text-green-700 dark:text-green-300">Linked to user. Changes sync automatically.</div>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeModal;
