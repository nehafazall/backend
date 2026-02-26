import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    User, FileText, DollarSign, Mail, Download, ArrowLeft, Save, 
    Calendar, Building2, Phone, CreditCard, AlertTriangle, Clock,
    Passport, IdCard, Car, GraduationCap, Heart, Briefcase, Plus
} from 'lucide-react';

const DOCUMENT_TYPES = [
    { key: 'passport', label: 'Passport', icon: Passport, fields: ['number', 'issue_date', 'expiry_date', 'issuing_country'] },
    { key: 'visa', label: 'Visa', icon: IdCard, fields: ['type', 'number', 'expiry_date', 'status'] },
    { key: 'emirates_id', label: 'Emirates ID', icon: IdCard, fields: ['number', 'expiry_date'] },
    { key: 'labour_card', label: 'Labour Card', icon: Briefcase, fields: ['number', 'expiry_date'] },
    { key: 'work_permit', label: 'Work Permit', icon: Briefcase, fields: ['number', 'expiry_date'] },
    { key: 'health_insurance', label: 'Health Insurance', icon: Heart, fields: ['provider', 'card_number', 'expiry_date'] },
    { key: 'driving_license', label: 'Driving License', icon: Car, fields: ['number', 'expiry_date', 'type'] },
];

const EmployeeDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Document editing
    const [documents, setDocuments] = useState({});
    const [otherDocuments, setOtherDocuments] = useState([]);
    const [showAddDocModal, setShowAddDocModal] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: '', number: '', expiry_date: '' });
    
    // Salary editing
    const [salary, setSalary] = useState({
        basic_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        telephone_allowance: 0,
        other_allowances: 0,
        deductions: 0,
        commission: 0,
        incentives: 0
    });
    
    // Payslip
    const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth() + 1);
    const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());
    const [payslip, setPayslip] = useState(null);
    const [sendingPayslip, setSendingPayslip] = useState(false);

    useEffect(() => {
        fetchEmployee();
    }, [id]);

    const fetchEmployee = async () => {
        try {
            const res = await api.get(`/hr/employees/${id}`);
            setEmployee(res.data);
            
            // Initialize documents
            const docs = {};
            DOCUMENT_TYPES.forEach(dt => {
                docs[dt.key] = res.data[dt.key] || {};
            });
            setDocuments(docs);
            setOtherDocuments(res.data.other_documents || []);
            
            // Initialize salary
            if (res.data.salary_structure) {
                setSalary(res.data.salary_structure);
            }
        } catch (error) {
            toast.error('Failed to load employee');
            navigate('/hr/employees');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDocuments = async () => {
        setSaving(true);
        try {
            await api.put(`/hr/employees/${employee.id}/documents`, {
                ...documents,
                other_documents: otherDocuments
            });
            toast.success('Documents saved successfully');
            fetchEmployee();
        } catch (error) {
            toast.error('Failed to save documents');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSalary = async () => {
        setSaving(true);
        try {
            await api.put(`/hr/employees/${employee.id}/salary`, salary);
            toast.success('Salary updated successfully');
            fetchEmployee();
        } catch (error) {
            toast.error('Failed to update salary');
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePayslip = async () => {
        try {
            const res = await api.get(`/hr/employees/${employee.id}/payslip`, {
                params: { month: payslipMonth, year: payslipYear }
            });
            setPayslip(res.data);
        } catch (error) {
            toast.error('Failed to generate payslip');
        }
    };

    const handleEmailPayslip = async () => {
        setSendingPayslip(true);
        try {
            await api.post(`/hr/employees/${employee.id}/payslip/email`, null, {
                params: { month: payslipMonth, year: payslipYear }
            });
            toast.success(`Payslip emailed to ${employee.company_email}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to email payslip');
        } finally {
            setSendingPayslip(false);
        }
    };

    const addOtherDocument = () => {
        if (!newDoc.name) return;
        setOtherDocuments([...otherDocuments, { ...newDoc, id: Date.now() }]);
        setNewDoc({ name: '', number: '', expiry_date: '' });
        setShowAddDocModal(false);
    };

    const removeOtherDocument = (docId) => {
        setOtherDocuments(otherDocuments.filter(d => d.id !== docId));
    };

    const isExpiringSoon = (date) => {
        if (!date) return false;
        const expiry = new Date(date);
        const today = new Date();
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil >= 0;
    };

    const isExpired = (date) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const calculateGross = () => {
        return (
            parseFloat(salary.basic_salary || 0) +
            parseFloat(salary.housing_allowance || 0) +
            parseFloat(salary.transport_allowance || 0) +
            parseFloat(salary.telephone_allowance || 0) +
            parseFloat(salary.other_allowances || 0) +
            parseFloat(salary.commission || 0) +
            parseFloat(salary.incentives || 0)
        );
    };

    const calculateNet = () => {
        return calculateGross() - parseFloat(salary.deductions || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!employee) return null;

    return (
        <div className="space-y-6" data-testid="employee-details-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/employees')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{employee.full_name}</h1>
                        <p className="text-muted-foreground">
                            {employee.employee_id} • {employee.designation} • {employee.department}
                        </p>
                    </div>
                </div>
                <Badge className={employee.employment_status === 'active' ? 'bg-green-500' : 'bg-amber-500'}>
                    {employee.employment_status}
                </Badge>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <User className="h-4 w-4" />Overview
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />Documents
                    </TabsTrigger>
                    <TabsTrigger value="salary" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />Salary
                    </TabsTrigger>
                    <TabsTrigger value="payslip" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />Payslip
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5" />Personal Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Full Name</span>
                                        <p className="font-medium">{employee.full_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Employee ID</span>
                                        <p className="font-medium">{employee.employee_id}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email</span>
                                        <p className="font-medium">{employee.company_email || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Phone</span>
                                        <p className="font-medium">{employee.mobile_number || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Nationality</span>
                                        <p className="font-medium">{employee.nationality || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Date of Birth</span>
                                        <p className="font-medium">{employee.date_of_birth || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />Employment Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Department</span>
                                        <p className="font-medium">{employee.department}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Designation</span>
                                        <p className="font-medium">{employee.designation}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Joining Date</span>
                                        <p className="font-medium">{employee.joining_date}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Location</span>
                                        <p className="font-medium">{employee.work_location}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Employment Type</span>
                                        <p className="font-medium capitalize">{employee.employment_type?.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge className={employee.employment_status === 'active' ? 'bg-green-500' : 'bg-amber-500'}>
                                            {employee.employment_status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />Bank Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Bank Name</span>
                                        <p className="font-medium">{employee.bank_details?.bank_name || '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Account Number</span>
                                        <p className="font-medium">{employee.bank_details?.account_number || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">IBAN</span>
                                        <p className="font-medium font-mono text-xs">{employee.bank_details?.iban || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />Salary Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Basic Salary</span>
                                        <p className="font-medium">AED {(employee.salary_structure?.basic_salary || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Total Allowances</span>
                                        <p className="font-medium">AED {(
                                            (employee.salary_structure?.housing_allowance || 0) +
                                            (employee.salary_structure?.transport_allowance || 0) +
                                            (employee.salary_structure?.telephone_allowance || 0) +
                                            (employee.salary_structure?.other_allowances || 0)
                                        ).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Gross Salary</span>
                                        <p className="font-medium text-green-500">AED {(employee.salary_structure?.gross_salary || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Net Salary</span>
                                        <p className="font-medium text-emerald-500 text-lg">AED {(employee.salary_structure?.net_salary || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-muted-foreground">Track employee documents and expiry dates</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowAddDocModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />Add Other Document
                            </Button>
                            <Button onClick={handleSaveDocuments} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Documents'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DOCUMENT_TYPES.map((docType) => {
                            const doc = documents[docType.key] || {};
                            const Icon = docType.icon;
                            const expiring = isExpiringSoon(doc.expiry_date);
                            const expired = isExpired(doc.expiry_date);
                            
                            return (
                                <Card key={docType.key} className={`${expired ? 'border-red-500' : expiring ? 'border-amber-500' : ''}`}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />{docType.label}
                                            </span>
                                            {expired && <Badge variant="destructive">Expired</Badge>}
                                            {expiring && !expired && <Badge className="bg-amber-500">Expiring Soon</Badge>}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {docType.fields.includes('number') && (
                                            <div>
                                                <Label className="text-xs">Number</Label>
                                                <Input
                                                    value={doc.number || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, number: e.target.value }
                                                    })}
                                                    placeholder="Document number"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('card_number') && (
                                            <div>
                                                <Label className="text-xs">Card Number</Label>
                                                <Input
                                                    value={doc.card_number || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, card_number: e.target.value }
                                                    })}
                                                    placeholder="Card number"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('type') && (
                                            <div>
                                                <Label className="text-xs">Type</Label>
                                                <Input
                                                    value={doc.type || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, type: e.target.value }
                                                    })}
                                                    placeholder="Type"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('provider') && (
                                            <div>
                                                <Label className="text-xs">Provider</Label>
                                                <Input
                                                    value={doc.provider || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, provider: e.target.value }
                                                    })}
                                                    placeholder="Provider name"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('issuing_country') && (
                                            <div>
                                                <Label className="text-xs">Issuing Country</Label>
                                                <Input
                                                    value={doc.issuing_country || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, issuing_country: e.target.value }
                                                    })}
                                                    placeholder="Country"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('issue_date') && (
                                            <div>
                                                <Label className="text-xs">Issue Date</Label>
                                                <Input
                                                    type="date"
                                                    value={doc.issue_date || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, issue_date: e.target.value }
                                                    })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('expiry_date') && (
                                            <div>
                                                <Label className="text-xs">Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={doc.expiry_date || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, expiry_date: e.target.value }
                                                    })}
                                                    className={`h-8 text-sm ${expired ? 'border-red-500' : expiring ? 'border-amber-500' : ''}`}
                                                />
                                            </div>
                                        )}
                                        {docType.fields.includes('status') && (
                                            <div>
                                                <Label className="text-xs">Status</Label>
                                                <Input
                                                    value={doc.status || ''}
                                                    onChange={(e) => setDocuments({
                                                        ...documents,
                                                        [docType.key]: { ...doc, status: e.target.value }
                                                    })}
                                                    placeholder="Valid/Expired/Processing"
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Other Documents Section */}
                    {otherDocuments.length > 0 && (
                        <>
                            <Separator className="my-6" />
                            <h3 className="text-lg font-semibold">Other Documents</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {otherDocuments.map((doc) => (
                                    <Card key={doc.id}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center justify-between">
                                                <span>{doc.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 h-6 px-2"
                                                    onClick={() => removeOtherDocument(doc.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-sm">
                                            <p><span className="text-muted-foreground">Number:</span> {doc.number || '-'}</p>
                                            <p><span className="text-muted-foreground">Expiry:</span> {doc.expiry_date || '-'}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-muted-foreground">Manage employee salary structure</p>
                        <Button onClick={handleSaveSalary} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Salary'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg text-green-500">Earnings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Basic Salary (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.basic_salary}
                                        onChange={(e) => setSalary({ ...salary, basic_salary: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Housing Allowance (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.housing_allowance}
                                        onChange={(e) => setSalary({ ...salary, housing_allowance: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Transport Allowance (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.transport_allowance}
                                        onChange={(e) => setSalary({ ...salary, transport_allowance: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Telephone Allowance (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.telephone_allowance}
                                        onChange={(e) => setSalary({ ...salary, telephone_allowance: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Other Allowances (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.other_allowances}
                                        onChange={(e) => setSalary({ ...salary, other_allowances: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Commission (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.commission}
                                        onChange={(e) => setSalary({ ...salary, commission: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <Label>Incentives (AED)</Label>
                                    <Input
                                        type="number"
                                        value={salary.incentives}
                                        onChange={(e) => setSalary({ ...salary, incentives: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-500">Deductions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label>Total Deductions (AED)</Label>
                                        <Input
                                            type="number"
                                            value={salary.deductions}
                                            onChange={(e) => setSalary({ ...salary, deductions: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
                                <CardHeader>
                                    <CardTitle className="text-lg">Salary Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Gross Salary</span>
                                        <span className="font-medium">AED {calculateGross().toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Deductions</span>
                                        <span className="font-medium text-red-500">- AED {parseFloat(salary.deductions || 0).toLocaleString()}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Net Salary</span>
                                        <span className="font-bold text-2xl text-emerald-500">AED {calculateNet().toLocaleString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* Payslip Tab */}
                <TabsContent value="payslip" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate & Send Payslip</CardTitle>
                            <CardDescription>Generate payslip for a specific month and email it to the employee</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 items-end">
                                <div>
                                    <Label>Month</Label>
                                    <select
                                        className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={payslipMonth}
                                        onChange={(e) => setPayslipMonth(parseInt(e.target.value))}
                                    >
                                        {['January', 'February', 'March', 'April', 'May', 'June', 
                                          'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                            <option key={i + 1} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Year</Label>
                                    <Input
                                        type="number"
                                        value={payslipYear}
                                        onChange={(e) => setPayslipYear(parseInt(e.target.value))}
                                        className="w-24"
                                    />
                                </div>
                                <Button onClick={handleGeneratePayslip}>
                                    <FileText className="h-4 w-4 mr-2" />Generate Payslip
                                </Button>
                            </div>

                            {payslip && (
                                <div className="mt-6 p-6 border rounded-lg bg-white text-black" id="payslip-content">
                                    {/* Payslip Header */}
                                    <div className="text-center border-b pb-4 mb-4">
                                        <h2 className="text-2xl font-bold text-blue-600">{payslip.company.name}</h2>
                                        <p className="text-sm text-gray-600">{payslip.company.address}</p>
                                        <h3 className="text-xl font-semibold mt-4">PAYSLIP</h3>
                                        <p className="text-gray-600">{payslip.pay_period.month_name} {payslip.pay_period.year}</p>
                                    </div>

                                    {/* Employee Details */}
                                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                        <div>
                                            <p><strong>Employee ID:</strong> {payslip.employee.id}</p>
                                            <p><strong>Name:</strong> {payslip.employee.name}</p>
                                            <p><strong>Department:</strong> {payslip.employee.department}</p>
                                            <p><strong>Designation:</strong> {payslip.employee.designation}</p>
                                        </div>
                                        <div>
                                            <p><strong>Bank:</strong> {payslip.employee.bank_name || '-'}</p>
                                            <p><strong>Account:</strong> {payslip.employee.account_number || '-'}</p>
                                            <p><strong>IBAN:</strong> {payslip.employee.iban || '-'}</p>
                                            <p><strong>Pay Date:</strong> {payslip.pay_period.pay_date}</p>
                                        </div>
                                    </div>

                                    {/* Earnings & Deductions */}
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h4 className="font-semibold text-green-600 border-b pb-1 mb-2">EARNINGS</h4>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    <tr><td>Basic Salary</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.basic_salary.toLocaleString()}</td></tr>
                                                    <tr><td>Housing Allowance</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.housing_allowance.toLocaleString()}</td></tr>
                                                    <tr><td>Transport Allowance</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.transport_allowance.toLocaleString()}</td></tr>
                                                    <tr><td>Telephone Allowance</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.telephone_allowance.toLocaleString()}</td></tr>
                                                    <tr><td>Other Allowances</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.other_allowances.toLocaleString()}</td></tr>
                                                    <tr><td>Commission</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.commission.toLocaleString()}</td></tr>
                                                    <tr><td>Incentives</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.incentives.toLocaleString()}</td></tr>
                                                    <tr className="font-semibold border-t"><td>Gross Salary</td><td className="text-right">{payslip.summary.currency} {payslip.earnings.gross_salary.toLocaleString()}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-red-600 border-b pb-1 mb-2">DEDUCTIONS</h4>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    <tr><td>Total Deductions</td><td className="text-right">{payslip.summary.currency} {payslip.deductions.total_deductions.toLocaleString()}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Net Salary */}
                                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                                        <p className="text-sm text-gray-600">NET SALARY</p>
                                        <p className="text-3xl font-bold text-blue-600">{payslip.summary.currency} {payslip.summary.net_salary.toLocaleString()}</p>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                                        <p>This is a computer-generated payslip and does not require a signature.</p>
                                        <p>Generated on {new Date(payslip.generated_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {payslip && (
                                <div className="flex gap-2 mt-4">
                                    <Button onClick={handleEmailPayslip} disabled={sendingPayslip}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        {sendingPayslip ? 'Sending...' : `Email to ${employee.company_email}`}
                                    </Button>
                                    <Button variant="outline" onClick={() => window.print()}>
                                        <Download className="h-4 w-4 mr-2" />Download PDF
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Other Document Modal */}
            <Dialog open={showAddDocModal} onOpenChange={setShowAddDocModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Other Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Document Name *</Label>
                            <Input
                                value={newDoc.name}
                                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                                placeholder="e.g., Educational Certificate, Training Certificate"
                            />
                        </div>
                        <div>
                            <Label>Document Number</Label>
                            <Input
                                value={newDoc.number}
                                onChange={(e) => setNewDoc({ ...newDoc, number: e.target.value })}
                                placeholder="Certificate/Document number"
                            />
                        </div>
                        <div>
                            <Label>Expiry Date (if applicable)</Label>
                            <Input
                                type="date"
                                value={newDoc.expiry_date}
                                onChange={(e) => setNewDoc({ ...newDoc, expiry_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDocModal(false)}>Cancel</Button>
                        <Button onClick={addOtherDocument}>Add Document</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EmployeeDetailsPage;
