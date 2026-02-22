import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Briefcase, CreditCard, FileText, Save, Building2, UserCog, Shield, Users } from 'lucide-react';

const EMPLOYMENT_STATUS = [
    { value: 'active', label: 'Active' },
    { value: 'probation', label: 'Probation' },
    { value: 'on_notice', label: 'On Notice' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'terminated', label: 'Terminated' },
    { value: 'long_leave', label: 'Long Leave' }
];

const VISA_TYPES = [
    { value: 'company', label: 'Company Sponsored' },
    { value: 'own', label: 'Own Visa' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'dependent', label: 'Dependent' },
    { value: 'visit', label: 'Visit Visa' }
];

const EMPLOYEE_CATEGORIES = [
    { value: 'A+', label: 'A+' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' }
];

const EmployeeModal = ({ open, onOpenChange, employee, onSave }) => {
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [syncOptions, setSyncOptions] = useState({
        departments: [],
        roles: [],
        teams: [],
        managers: [],
        locations: [],
        employment_types: []
    });
    
    const [form, setForm] = useState({
        employee_id: '',
        full_name: '',
        gender: '',
        date_of_birth: '',
        nationality: '',
        personal_email: '',
        company_email: '',
        mobile_number: '',
        marital_status: '',
        department: '',
        designation: '',
        reporting_manager_id: '',
        employment_type: 'full_time',
        work_location: 'Dubai',
        joining_date: '',
        probation_days: 90,
        confirmation_date: '',
        notice_period_days: 30,
        employment_status: 'probation',
        employee_category: '',
        grade: '',
        // User account sync fields
        role: '',
        team_id: '',
        create_user_account: true,
        initial_password: '',
        // Other fields
        emergency_contact: { name: '', relationship: '', phone: '' },
        visa_details: {
            visa_type: '',
            visa_expiry: '',
            emirates_id: '',
            emirates_id_expiry: '',
            passport_number: '',
            passport_expiry: '',
            labor_card_number: '',
            labor_card_expiry: '',
            company_sponsor: false
        },
        salary_structure: {
            basic_salary: 0,
            housing_allowance: 0,
            transport_allowance: 0,
            food_allowance: 0,
            phone_allowance: 0,
            other_allowances: 0,
            fixed_incentive: 0,
            commission_eligible: false,
            commission_plan_type: '',
            payroll_group: ''
        },
        bank_details: {
            bank_name: '',
            account_number: '',
            iban: '',
            swift_code: ''
        }
    });

    // Fetch sync options (departments, roles, teams, managers)
    useEffect(() => {
        if (open) {
            fetchSyncOptions();
        }
    }, [open]);

    const fetchSyncOptions = async () => {
        try {
            const res = await api.get('/hr/employees/sync-options');
            setSyncOptions(res.data);
        } catch (error) {
            console.error('Error fetching sync options:', error);
        }
    };

    useEffect(() => {
        if (employee) {
            setForm({
                ...form,
                ...employee,
                emergency_contact: employee.emergency_contact || { name: '', relationship: '', phone: '' },
                visa_details: employee.visa_details || {},
                salary_structure: employee.salary_structure || {},
                bank_details: employee.bank_details || {}
            });
        } else {
            resetForm();
        }
    }, [employee]);

    const resetForm = () => {
        setForm({
            employee_id: '',
            full_name: '',
            gender: '',
            date_of_birth: '',
            nationality: '',
            personal_email: '',
            company_email: '',
            mobile_number: '',
            marital_status: '',
            department: '',
            designation: '',
            reporting_manager_id: '',
            employment_type: 'full_time',
            work_location: 'Dubai',
            joining_date: '',
            probation_days: 90,
            confirmation_date: '',
            notice_period_days: 30,
            employment_status: 'probation',
            employee_category: '',
            grade: '',
            role: '',
            team_id: '',
            create_user_account: true,
            initial_password: '',
            emergency_contact: { name: '', relationship: '', phone: '' },
            visa_details: {},
            salary_structure: {},
            bank_details: {}
        });
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setForm(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            // Determine if this is a new employee or update
            const isNew = !employee?.id;
            
            if (isNew && form.create_user_account && form.company_email) {
                // Use the with-user endpoint for new employees with user creation
                const payload = {
                    employee_id: form.employee_id,
                    full_name: form.full_name,
                    gender: form.gender,
                    date_of_birth: form.date_of_birth,
                    nationality: form.nationality,
                    personal_email: form.personal_email,
                    company_email: form.company_email,
                    mobile_number: form.mobile_number,
                    department: form.department,
                    designation: form.designation,
                    reporting_manager_id: form.reporting_manager_id || null,
                    employment_type: form.employment_type,
                    work_location: form.work_location,
                    joining_date: form.joining_date,
                    probation_days: form.probation_days,
                    employment_status: form.employment_status,
                    role: form.role,
                    team_id: form.team_id || null,
                    create_user_account: form.create_user_account,
                    initial_password: form.initial_password || null,
                    salary_structure: form.salary_structure,
                    bank_details: form.bank_details,
                    visa_details: form.visa_details
                };
                await onSave(payload, 'create-with-user');
            } else {
                // Standard create/update
                await onSave(form, isNew ? 'create' : 'update');
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    // Filter teams by selected department
    const filteredTeams = syncOptions.teams.filter(t => 
        !form.department || t.department === form.department
    );

    // Filter managers by selected department (optional)
    const filteredManagers = syncOptions.managers;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{employee?.id ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    <DialogDescription>
                        {employee?.id 
                            ? 'Update employee information' 
                            : 'Create new employee record with optional user account'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[70vh] pr-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-5 w-full mb-4">
                            <TabsTrigger value="basic"><User className="h-4 w-4 mr-1" />Basic</TabsTrigger>
                            <TabsTrigger value="employment"><Briefcase className="h-4 w-4 mr-1" />Employment</TabsTrigger>
                            <TabsTrigger value="access"><Shield className="h-4 w-4 mr-1" />Access</TabsTrigger>
                            <TabsTrigger value="visa"><FileText className="h-4 w-4 mr-1" />Visa</TabsTrigger>
                            <TabsTrigger value="salary"><CreditCard className="h-4 w-4 mr-1" />Salary</TabsTrigger>
                        </TabsList>

                        {/* BASIC INFO TAB */}
                        <TabsContent value="basic" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Employee ID *</Label>
                                    <Input value={form.employee_id} onChange={(e) => handleChange('employee_id', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input type="date" value={form.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nationality</Label>
                                    <Input value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Personal Email</Label>
                                    <Input type="email" value={form.personal_email} onChange={(e) => handleChange('personal_email', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Email *</Label>
                                    <Input type="email" value={form.company_email} onChange={(e) => handleChange('company_email', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mobile Number</Label>
                                    <Input value={form.mobile_number} onChange={(e) => handleChange('mobile_number', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Marital Status</Label>
                                    <Select value={form.marital_status} onValueChange={(v) => handleChange('marital_status', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single</SelectItem>
                                            <SelectItem value="married">Married</SelectItem>
                                            <SelectItem value="divorced">Divorced</SelectItem>
                                            <SelectItem value="widowed">Widowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Card className="mt-4">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Emergency Contact</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={form.emergency_contact?.name || ''} onChange={(e) => handleNestedChange('emergency_contact', 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Relationship</Label>
                                        <Input value={form.emergency_contact?.relationship || ''} onChange={(e) => handleNestedChange('emergency_contact', 'relationship', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input value={form.emergency_contact?.phone || ''} onChange={(e) => handleNestedChange('emergency_contact', 'phone', e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* EMPLOYMENT TAB */}
                        <TabsContent value="employment" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department *</Label>
                                    <Select value={form.department} onValueChange={(v) => handleChange('department', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                        <SelectContent>
                                            {syncOptions.departments.map(d => (
                                                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Designation *</Label>
                                    <Input value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Reporting Manager</Label>
                                    <Select value={form.reporting_manager_id} onValueChange={(v) => handleChange('reporting_manager_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Manager" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {filteredManagers.map(m => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.full_name} ({m.designation})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Team</Label>
                                    <Select value={form.team_id} onValueChange={(v) => handleChange('team_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {filteredTeams.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name} {t.department && `(${t.department})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Employment Type</Label>
                                    <Select value={form.employment_type} onValueChange={(v) => handleChange('employment_type', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {syncOptions.employment_types.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Work Location</Label>
                                    <Select value={form.work_location} onValueChange={(v) => handleChange('work_location', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {syncOptions.locations.map(l => (
                                                <SelectItem key={l} value={l}>{l}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Joining Date *</Label>
                                    <Input type="date" value={form.joining_date} onChange={(e) => handleChange('joining_date', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Probation (Days)</Label>
                                    <Input type="number" value={form.probation_days} onChange={(e) => handleChange('probation_days', parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notice Period (Days)</Label>
                                    <Input type="number" value={form.notice_period_days} onChange={(e) => handleChange('notice_period_days', parseInt(e.target.value))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Employment Status</Label>
                                    <Select value={form.employment_status} onValueChange={(v) => handleChange('employment_status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {EMPLOYMENT_STATUS.map(s => (
                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Employee Category</Label>
                                    <Select value={form.employee_category} onValueChange={(v) => handleChange('employee_category', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {EMPLOYEE_CATEGORIES.map(c => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ACCESS TAB (User Account Sync) */}
                        <TabsContent value="access" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <UserCog className="h-5 w-5" />
                                        User Account Settings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!employee?.id && (
                                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                            <div>
                                                <p className="font-medium">Create User Account</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Automatically create login access for this employee
                                                </p>
                                            </div>
                                            <Switch 
                                                checked={form.create_user_account}
                                                onCheckedChange={(v) => handleChange('create_user_account', v)}
                                            />
                                        </div>
                                    )}
                                    
                                    {employee?.user_id && (
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <p className="text-sm text-green-600 dark:text-green-400">
                                                This employee has a linked user account. Changes to department, role, or status will be synced automatically.
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>System Role *</Label>
                                            <Select value={form.role} onValueChange={(v) => handleChange('role', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                                <SelectContent>
                                                    {syncOptions.roles.map(r => (
                                                        <SelectItem key={r.value} value={r.value}>
                                                            {r.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                {syncOptions.roles.find(r => r.value === form.role)?.description}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Assign to Team</Label>
                                            <Select value={form.team_id} onValueChange={(v) => handleChange('team_id', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select Team" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">No Team</SelectItem>
                                                    {syncOptions.teams.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>
                                                            {t.name} {t.leader_name && `(Lead: ${t.leader_name})`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    {!employee?.id && form.create_user_account && (
                                        <div className="space-y-2">
                                            <Label>Initial Password (Optional)</Label>
                                            <Input 
                                                type="text"
                                                placeholder="Leave empty for auto-generated password"
                                                value={form.initial_password} 
                                                onChange={(e) => handleChange('initial_password', e.target.value)} 
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Default: FirstName@123 (e.g., John@123)
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Access Sync Rules</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="text-sm space-y-2 text-muted-foreground">
                                        <li>• User account will be created with the company email as login</li>
                                        <li>• When employee status changes to Resigned/Terminated, user access is automatically disabled</li>
                                        <li>• Department and role changes are synced to the user account</li>
                                        <li>• Team membership is updated when team assignment changes</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* VISA TAB */}
                        <TabsContent value="visa" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Visa Type</Label>
                                    <Select value={form.visa_details?.visa_type} onValueChange={(v) => handleNestedChange('visa_details', 'visa_type', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {VISA_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Visa Expiry</Label>
                                    <Input type="date" value={form.visa_details?.visa_expiry || ''} onChange={(e) => handleNestedChange('visa_details', 'visa_expiry', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Emirates ID</Label>
                                    <Input value={form.visa_details?.emirates_id || ''} onChange={(e) => handleNestedChange('visa_details', 'emirates_id', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emirates ID Expiry</Label>
                                    <Input type="date" value={form.visa_details?.emirates_id_expiry || ''} onChange={(e) => handleNestedChange('visa_details', 'emirates_id_expiry', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Passport Number</Label>
                                    <Input value={form.visa_details?.passport_number || ''} onChange={(e) => handleNestedChange('visa_details', 'passport_number', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passport Expiry</Label>
                                    <Input type="date" value={form.visa_details?.passport_expiry || ''} onChange={(e) => handleNestedChange('visa_details', 'passport_expiry', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-4">
                                <Switch checked={form.visa_details?.company_sponsor || false} onCheckedChange={(v) => handleNestedChange('visa_details', 'company_sponsor', v)} />
                                <Label>Company Sponsored Visa</Label>
                            </div>
                        </TabsContent>

                        {/* SALARY TAB */}
                        <TabsContent value="salary" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Basic Salary (AED)</Label>
                                    <Input type="number" value={form.salary_structure?.basic_salary || 0} onChange={(e) => handleNestedChange('salary_structure', 'basic_salary', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Housing Allowance</Label>
                                    <Input type="number" value={form.salary_structure?.housing_allowance || 0} onChange={(e) => handleNestedChange('salary_structure', 'housing_allowance', parseFloat(e.target.value))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Transport Allowance</Label>
                                    <Input type="number" value={form.salary_structure?.transport_allowance || 0} onChange={(e) => handleNestedChange('salary_structure', 'transport_allowance', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Food Allowance</Label>
                                    <Input type="number" value={form.salary_structure?.food_allowance || 0} onChange={(e) => handleNestedChange('salary_structure', 'food_allowance', parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Allowance</Label>
                                    <Input type="number" value={form.salary_structure?.phone_allowance || 0} onChange={(e) => handleNestedChange('salary_structure', 'phone_allowance', parseFloat(e.target.value))} />
                                </div>
                            </div>
                            <Card className="mt-4">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Bank Details</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input value={form.bank_details?.bank_name || ''} onChange={(e) => handleNestedChange('bank_details', 'bank_name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Account Number</Label>
                                        <Input value={form.bank_details?.account_number || ''} onChange={(e) => handleNestedChange('bank_details', 'account_number', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IBAN</Label>
                                        <Input value={form.bank_details?.iban || ''} onChange={(e) => handleNestedChange('bank_details', 'iban', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SWIFT Code</Label>
                                        <Input value={form.bank_details?.swift_code || ''} onChange={(e) => handleNestedChange('bank_details', 'swift_code', e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : (employee?.id ? 'Update' : 'Create Employee')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeModal;
