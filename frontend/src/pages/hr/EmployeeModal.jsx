import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';

const EmployeeModal = ({ open, onOpenChange, employee, onSave }) => {
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [syncOptions, setSyncOptions] = useState({ departments: [], roles: [], teams: [], managers: [], locations: [], employment_types: [] });
    const [form, setForm] = useState(getInitialForm());

    function getInitialForm() {
        return {
            employee_id: '', full_name: '', gender: '', date_of_birth: '', nationality: '',
            personal_email: '', company_email: '', mobile_number: '', department: '',
            designation: '', reporting_manager_id: '', employment_type: 'full_time',
            work_location: 'Dubai', joining_date: '', probation_days: 90, notice_period_days: 30,
            employment_status: 'probation', role: '', team_id: '', create_user_account: true,
            initial_password: '', salary_structure: { basic_salary: 0, housing_allowance: 0 },
            bank_details: { bank_name: '', account_number: '', iban: '' },
            visa_details: { visa_type: '', visa_expiry: '', passport_number: '', passport_expiry: '' }
        };
    }

    useEffect(() => {
        if (open) fetchSyncOptions();
    }, [open]);

    useEffect(() => {
        if (employee) {
            setForm({ ...getInitialForm(), ...employee });
        } else {
            setForm(getInitialForm());
        }
    }, [employee]);

    const fetchSyncOptions = async () => {
        try {
            const res = await api.get('/hr/employees/sync-options');
            setSyncOptions(res.data);
        } catch (e) { console.error(e); }
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const handleNested = (parent, field, value) => setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const isNew = !employee?.id;
            if (isNew && form.create_user_account && form.company_email) {
                await onSave({
                    employee_id: form.employee_id, full_name: form.full_name, gender: form.gender,
                    date_of_birth: form.date_of_birth, company_email: form.company_email,
                    mobile_number: form.mobile_number, department: form.department,
                    designation: form.designation, reporting_manager_id: form.reporting_manager_id || null,
                    employment_type: form.employment_type, work_location: form.work_location,
                    joining_date: form.joining_date, probation_days: form.probation_days,
                    employment_status: form.employment_status, role: form.role,
                    team_id: form.team_id || null, create_user_account: true,
                    initial_password: form.initial_password || null,
                    salary_structure: form.salary_structure, bank_details: form.bank_details, visa_details: form.visa_details
                }, 'create-with-user');
            } else {
                await onSave(form, isNew ? 'create' : 'update');
            }
            onOpenChange(false);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{employee?.id ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="employment">Employment</TabsTrigger>
                        <TabsTrigger value="access">Access</TabsTrigger>
                        <TabsTrigger value="salary">Salary</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Employee ID *</Label><Input value={form.employee_id} onChange={(e) => handleChange('employee_id', e.target.value)} /></div>
                            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Gender</Label>
                                <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} /></div>
                            <div><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Personal Email</Label><Input type="email" value={form.personal_email} onChange={(e) => handleChange('personal_email', e.target.value)} /></div>
                            <div><Label>Company Email *</Label><Input type="email" value={form.company_email} onChange={(e) => handleChange('company_email', e.target.value)} /></div>
                        </div>
                        <div><Label>Mobile Number</Label><Input value={form.mobile_number} onChange={(e) => handleChange('mobile_number', e.target.value)} /></div>
                    </TabsContent>
                    <TabsContent value="employment" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Department *</Label>
                                <Select value={form.department} onValueChange={(v) => handleChange('department', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>{syncOptions.departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label>Designation *</Label><Input value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Reporting Manager</Label>
                                <Select value={form.reporting_manager_id} onValueChange={(v) => handleChange('reporting_manager_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent><SelectItem value="">None</SelectItem>{syncOptions.managers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label>Team</Label>
                                <Select value={form.team_id} onValueChange={(v) => handleChange('team_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent><SelectItem value="">None</SelectItem>{syncOptions.teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Employment Type</Label>
                                <Select value={form.employment_type} onValueChange={(v) => handleChange('employment_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{syncOptions.employment_types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label>Work Location</Label>
                                <Select value={form.work_location} onValueChange={(v) => handleChange('work_location', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{syncOptions.locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Joining Date *</Label><Input type="date" value={form.joining_date} onChange={(e) => handleChange('joining_date', e.target.value)} /></div>
                            <div><Label>Probation (Days)</Label><Input type="number" value={form.probation_days} onChange={(e) => handleChange('probation_days', parseInt(e.target.value))} /></div>
                            <div><Label>Status</Label>
                                <Select value={form.employment_status} onValueChange={(v) => handleChange('employment_status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem><SelectItem value="probation">Probation</SelectItem>
                                        <SelectItem value="on_notice">On Notice</SelectItem><SelectItem value="resigned">Resigned</SelectItem>
                                        <SelectItem value="terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="access" className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle className="text-sm">User Account Settings</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {!employee?.id && (
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                        <div><p className="font-medium">Create User Account</p><p className="text-sm text-muted-foreground">Auto-create login access</p></div>
                                        <Switch checked={form.create_user_account} onCheckedChange={(v) => handleChange('create_user_account', v)} />
                                    </div>
                                )}
                                {employee?.user_id && <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"><p className="text-sm text-green-600">Employee has linked user account. Changes sync automatically.</p></div>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>System Role *</Label>
                                        <Select value={form.role} onValueChange={(v) => handleChange('role', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                            <SelectContent>{syncOptions.roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Team</Label>
                                        <Select value={form.team_id} onValueChange={(v) => handleChange('team_id', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent><SelectItem value="">None</SelectItem>{syncOptions.teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {!employee?.id && form.create_user_account && (
                                    <div><Label>Initial Password</Label><Input placeholder="Leave empty for auto (FirstName@123)" value={form.initial_password} onChange={(e) => handleChange('initial_password', e.target.value)} /></div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="salary" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Basic Salary (AED)</Label><Input type="number" value={form.salary_structure?.basic_salary || 0} onChange={(e) => handleNested('salary_structure', 'basic_salary', parseFloat(e.target.value))} /></div>
                            <div><Label>Housing Allowance</Label><Input type="number" value={form.salary_structure?.housing_allowance || 0} onChange={(e) => handleNested('salary_structure', 'housing_allowance', parseFloat(e.target.value))} /></div>
                        </div>
                        <Card className="mt-4">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div><Label>Bank Name</Label><Input value={form.bank_details?.bank_name || ''} onChange={(e) => handleNested('bank_details', 'bank_name', e.target.value)} /></div>
                                <div><Label>Account Number</Label><Input value={form.bank_details?.account_number || ''} onChange={(e) => handleNested('bank_details', 'account_number', e.target.value)} /></div>
                                <div><Label>IBAN</Label><Input value={form.bank_details?.iban || ''} onChange={(e) => handleNested('bank_details', 'iban', e.target.value)} /></div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeModal;
