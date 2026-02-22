import React, { useState, useEffect } from 'react';
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
import { User, Briefcase, CreditCard, FileText, Save, Building2 } from 'lucide-react';

const DEPARTMENTS = [
    'Sales', 'Finance', 'Customer Service', 'Mentors/Academics',
    'Operations', 'Marketing', 'HR', 'Quality Control'
];

const EMPLOYMENT_TYPES = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'intern', label: 'Intern' },
    { value: 'part_time', label: 'Part-time' }
];

const EMPLOYMENT_STATUS = [
    { value: 'active', label: 'Active' },
    { value: 'probation', label: 'Probation' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'terminated', label: 'Terminated' }
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
        work_location: 'UAE',
        joining_date: '',
        probation_days: 90,
        confirmation_date: '',
        notice_period_days: 30,
        employment_status: 'probation',
        employee_category: '',
        grade: '',
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
            swift_code: '',
            wps_id: ''
        },
        annual_leave_balance: 30,
        sick_leave_balance: 15
    });

    useEffect(() => {
        if (employee) {
            setForm({
                ...form,
                ...employee,
                emergency_contact: employee.emergency_contact || { name: '', relationship: '', phone: '' },
                visa_details: employee.visa_details || form.visa_details,
                salary_structure: employee.salary_structure || form.salary_structure,
                bank_details: employee.bank_details || form.bank_details
            });
        }
    }, [employee]);

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const updateNestedForm = (parent, field, value) => {
        setForm(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            await onSave(form);
        } catch (error) {
            // Error handled by parent
        } finally {
            setSaving(false);
        }
    };

    const calculateGrossSalary = () => {
        const s = form.salary_structure || {};
        return (
            parseFloat(s.basic_salary || 0) +
            parseFloat(s.housing_allowance || 0) +
            parseFloat(s.transport_allowance || 0) +
            parseFloat(s.food_allowance || 0) +
            parseFloat(s.phone_allowance || 0) +
            parseFloat(s.other_allowances || 0) +
            parseFloat(s.fixed_incentive || 0)
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{employee?.id ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    <DialogDescription>
                        {employee?.id ? `Editing ${employee.full_name}` : 'Fill in the employee details'}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="basic"><User className="h-4 w-4 mr-1" />Basic</TabsTrigger>
                        <TabsTrigger value="employment"><Briefcase className="h-4 w-4 mr-1" />Employment</TabsTrigger>
                        <TabsTrigger value="visa"><FileText className="h-4 w-4 mr-1" />Visa & Legal</TabsTrigger>
                        <TabsTrigger value="payroll"><CreditCard className="h-4 w-4 mr-1" />Payroll</TabsTrigger>
                        <TabsTrigger value="bank"><Building2 className="h-4 w-4 mr-1" />Bank</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[50vh] mt-4 pr-4">
                        <TabsContent value="basic" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Employee ID *</Label>
                                    <Input 
                                        value={form.employee_id}
                                        onChange={(e) => updateForm('employee_id', e.target.value)}
                                        placeholder="CLT-001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Name *</Label>
                                    <Input 
                                        value={form.full_name}
                                        onChange={(e) => updateForm('full_name', e.target.value)}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={form.gender} onValueChange={(v) => updateForm('gender', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input 
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={(e) => updateForm('date_of_birth', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nationality</Label>
                                    <Input 
                                        value={form.nationality}
                                        onChange={(e) => updateForm('nationality', e.target.value)}
                                        placeholder="Indian"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Marital Status</Label>
                                    <Select value={form.marital_status} onValueChange={(v) => updateForm('marital_status', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single</SelectItem>
                                            <SelectItem value="married">Married</SelectItem>
                                            <SelectItem value="divorced">Divorced</SelectItem>
                                            <SelectItem value="widowed">Widowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Personal Email</Label>
                                    <Input 
                                        type="email"
                                        value={form.personal_email}
                                        onChange={(e) => updateForm('personal_email', e.target.value)}
                                        placeholder="john@personal.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Email</Label>
                                    <Input 
                                        type="email"
                                        value={form.company_email}
                                        onChange={(e) => updateForm('company_email', e.target.value)}
                                        placeholder="john@clt-academy.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mobile Number</Label>
                                    <Input 
                                        value={form.mobile_number}
                                        onChange={(e) => updateForm('mobile_number', e.target.value)}
                                        placeholder="+971501234567"
                                    />
                                </div>
                            </div>

                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Emergency Contact</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input 
                                            value={form.emergency_contact?.name || ''}
                                            onChange={(e) => updateNestedForm('emergency_contact', 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Relationship</Label>
                                        <Input 
                                            value={form.emergency_contact?.relationship || ''}
                                            onChange={(e) => updateNestedForm('emergency_contact', 'relationship', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input 
                                            value={form.emergency_contact?.phone || ''}
                                            onChange={(e) => updateNestedForm('emergency_contact', 'phone', e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="employment" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department *</Label>
                                    <Select value={form.department} onValueChange={(v) => updateForm('department', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                                        <SelectContent>
                                            {DEPARTMENTS.map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Designation *</Label>
                                    <Input 
                                        value={form.designation}
                                        onChange={(e) => updateForm('designation', e.target.value)}
                                        placeholder="Sales Executive"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Employment Type</Label>
                                    <Select value={form.employment_type} onValueChange={(v) => updateForm('employment_type', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {EMPLOYMENT_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Employment Status</Label>
                                    <Select value={form.employment_status} onValueChange={(v) => updateForm('employment_status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {EMPLOYMENT_STATUS.map(s => (
                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Work Location</Label>
                                    <Select value={form.work_location} onValueChange={(v) => updateForm('work_location', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UAE">UAE</SelectItem>
                                            <SelectItem value="India">India</SelectItem>
                                            <SelectItem value="Remote">Remote</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Joining Date *</Label>
                                    <Input 
                                        type="date"
                                        value={form.joining_date}
                                        onChange={(e) => updateForm('joining_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Probation Days</Label>
                                    <Input 
                                        type="number"
                                        value={form.probation_days}
                                        onChange={(e) => updateForm('probation_days', parseInt(e.target.value) || 90)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirmation Date</Label>
                                    <Input 
                                        type="date"
                                        value={form.confirmation_date}
                                        onChange={(e) => updateForm('confirmation_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Notice Period (Days)</Label>
                                    <Input 
                                        type="number"
                                        value={form.notice_period_days}
                                        onChange={(e) => updateForm('notice_period_days', parseInt(e.target.value) || 30)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Employee Category</Label>
                                    <Select value={form.employee_category} onValueChange={(v) => updateForm('employee_category', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                        <SelectContent>
                                            {EMPLOYEE_CATEGORIES.map(c => (
                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Grade / Band</Label>
                                    <Input 
                                        value={form.grade}
                                        onChange={(e) => updateForm('grade', e.target.value)}
                                        placeholder="L3"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="visa" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Visa Type</Label>
                                    <Select 
                                        value={form.visa_details?.visa_type || ''} 
                                        onValueChange={(v) => updateNestedForm('visa_details', 'visa_type', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            {VISA_TYPES.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Visa Expiry</Label>
                                    <Input 
                                        type="date"
                                        value={form.visa_details?.visa_expiry || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'visa_expiry', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emirates ID</Label>
                                    <Input 
                                        value={form.visa_details?.emirates_id || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'emirates_id', e.target.value)}
                                        placeholder="784-XXXX-XXXXXXX-X"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emirates ID Expiry</Label>
                                    <Input 
                                        type="date"
                                        value={form.visa_details?.emirates_id_expiry || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'emirates_id_expiry', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passport Number</Label>
                                    <Input 
                                        value={form.visa_details?.passport_number || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'passport_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passport Expiry</Label>
                                    <Input 
                                        type="date"
                                        value={form.visa_details?.passport_expiry || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'passport_expiry', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Labor Card Number</Label>
                                    <Input 
                                        value={form.visa_details?.labor_card_number || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'labor_card_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Labor Card Expiry</Label>
                                    <Input 
                                        type="date"
                                        value={form.visa_details?.labor_card_expiry || ''}
                                        onChange={(e) => updateNestedForm('visa_details', 'labor_card_expiry', e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 col-span-2">
                                    <Switch 
                                        checked={form.visa_details?.company_sponsor || false}
                                        onCheckedChange={(v) => updateNestedForm('visa_details', 'company_sponsor', v)}
                                    />
                                    <Label>Company Sponsored Visa</Label>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="payroll" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Basic Salary (AED)</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.basic_salary || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'basic_salary', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Housing Allowance</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.housing_allowance || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'housing_allowance', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Transport Allowance</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.transport_allowance || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'transport_allowance', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Food Allowance</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.food_allowance || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'food_allowance', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Allowance</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.phone_allowance || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'phone_allowance', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Other Allowances</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.other_allowances || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'other_allowances', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fixed Incentive</Label>
                                    <Input 
                                        type="number"
                                        value={form.salary_structure?.fixed_incentive || 0}
                                        onChange={(e) => updateNestedForm('salary_structure', 'fixed_incentive', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Payroll Group</Label>
                                    <Input 
                                        value={form.salary_structure?.payroll_group || ''}
                                        onChange={(e) => updateNestedForm('salary_structure', 'payroll_group', e.target.value)}
                                        placeholder="sales, support, admin"
                                    />
                                </div>
                            </div>
                            
                            <Card className="bg-muted/50">
                                <CardContent className="pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Gross Salary (Monthly)</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            AED {calculateGrossSalary().toLocaleString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        checked={form.salary_structure?.commission_eligible || false}
                                        onCheckedChange={(v) => updateNestedForm('salary_structure', 'commission_eligible', v)}
                                    />
                                    <Label>Commission Eligible</Label>
                                </div>
                                {form.salary_structure?.commission_eligible && (
                                    <Select 
                                        value={form.salary_structure?.commission_plan_type || ''} 
                                        onValueChange={(v) => updateNestedForm('salary_structure', 'commission_plan_type', v)}
                                    >
                                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Plan Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="slab">Slab</SelectItem>
                                            <SelectItem value="percentage">Percentage</SelectItem>
                                            <SelectItem value="fixed">Fixed</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Annual Leave Balance (Days)</Label>
                                    <Input 
                                        type="number"
                                        value={form.annual_leave_balance}
                                        onChange={(e) => updateForm('annual_leave_balance', parseFloat(e.target.value) || 30)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sick Leave Balance (Days)</Label>
                                    <Input 
                                        type="number"
                                        value={form.sick_leave_balance}
                                        onChange={(e) => updateForm('sick_leave_balance', parseFloat(e.target.value) || 15)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="bank" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Select 
                                        value={form.bank_details?.bank_name || ''} 
                                        onValueChange={(v) => updateNestedForm('bank_details', 'bank_name', v)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Emirates NBD">Emirates NBD</SelectItem>
                                            <SelectItem value="ADCB">ADCB</SelectItem>
                                            <SelectItem value="ADIB">ADIB</SelectItem>
                                            <SelectItem value="FAB">First Abu Dhabi Bank</SelectItem>
                                            <SelectItem value="Mashreq">Mashreq</SelectItem>
                                            <SelectItem value="RAK Bank">RAK Bank</SelectItem>
                                            <SelectItem value="CBD">Commercial Bank of Dubai</SelectItem>
                                            <SelectItem value="DIB">Dubai Islamic Bank</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input 
                                        value={form.bank_details?.account_number || ''}
                                        onChange={(e) => updateNestedForm('bank_details', 'account_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IBAN</Label>
                                    <Input 
                                        value={form.bank_details?.iban || ''}
                                        onChange={(e) => updateNestedForm('bank_details', 'iban', e.target.value)}
                                        placeholder="AE07..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>SWIFT Code</Label>
                                    <Input 
                                        value={form.bank_details?.swift_code || ''}
                                        onChange={(e) => updateNestedForm('bank_details', 'swift_code', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>WPS ID</Label>
                                    <Input 
                                        value={form.bank_details?.wps_id || ''}
                                        onChange={(e) => updateNestedForm('bank_details', 'wps_id', e.target.value)}
                                        placeholder="For UAE Wage Protection System"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : (employee?.id ? 'Update Employee' : 'Create Employee')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeModal;
