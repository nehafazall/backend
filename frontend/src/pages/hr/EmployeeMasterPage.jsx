import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Users, UserPlus, Search, RefreshCw, Building2, MapPin, 
    Filter, Download, Eye, Pencil, AlertTriangle, Calendar, UserCheck
} from 'lucide-react';
import EmployeeModal from './EmployeeModal';
import ImportButton from '@/components/ImportButton';

const STATUS_COLORS = {
    active: 'bg-green-500',
    probation: 'bg-amber-500',
    suspended: 'bg-red-500',
    resigned: 'bg-slate-500',
    terminated: 'bg-red-700',
    on_notice: 'bg-orange-500',
    long_leave: 'bg-purple-500'
};

const EmployeeMasterPage = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, probation: 0 });
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, [filterDept, filterStatus]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/hr/employees/sync-options');
            setDepartments(res.data.departments || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterDept) params.append('department', filterDept);
            if (filterStatus) params.append('status', filterStatus);
            if (search) params.append('search', search);
            
            const response = await api.get(`/hr/employees?${params.toString()}`);
            setEmployees(response.data || []);
            
            // Calculate stats
            const active = (response.data || []).filter(e => e.employment_status === 'active').length;
            const probation = (response.data || []).filter(e => e.employment_status === 'probation').length;
            setStats({
                total: response.data?.length || 0,
                active,
                probation
            });
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchEmployees();
    };

    const openCreateModal = async () => {
        try {
            const nextIdRes = await api.get('/hr/employees/next-id');
            setSelectedEmployee({ employee_id: nextIdRes.data.next_employee_id });
            setShowModal(true);
        } catch (error) {
            setSelectedEmployee({ employee_id: '' });
            setShowModal(true);
        }
    };

    const openEditModal = (employee) => {
        setSelectedEmployee(employee);
        setShowModal(true);
    };

    const handleSyncToUsers = async () => {
        setSyncing(true);
        try {
            const res = await api.post('/hr/employees/sync-to-users');
            toast.success(res.data.message);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to sync employees to users');
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveEmployee = async (data, mode = 'standard') => {
        try {
            if (mode === 'create-with-user') {
                // Create employee with automatic user account
                const res = await api.post('/hr/employees/with-user', data);
                toast.success(res.data.message);
            } else if (data.id) {
                // Update existing employee
                await api.put(`/hr/employees/${data.id}`, data);
                toast.success('Employee updated successfully');
            } else {
                // Create new employee without user account
                await api.post('/hr/employees', data);
                toast.success('Employee created successfully');
            }
            setShowModal(false);
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save employee');
            throw error;
        }
    };

    const getDocumentAlertCount = (employee) => {
        let count = 0;
        const visa = employee.visa_details || {};
        const today = new Date();
        
        const checkExpiry = (dateStr) => {
            if (!dateStr) return false;
            const expiry = new Date(dateStr);
            const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            return days <= 90 && days >= 0;
        };
        
        if (checkExpiry(visa.visa_expiry)) count++;
        if (checkExpiry(visa.emirates_id_expiry)) count++;
        if (checkExpiry(visa.passport_expiry)) count++;
        if (checkExpiry(visa.labor_card_expiry)) count++;
        
        return count;
    };

    return (
        <div className="space-y-6" data-testid="employee-master-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employee Master</h1>
                    <p className="text-muted-foreground">Manage employee records and information</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchEmployees}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <ImportButton templateType="employees" title="Import Employees" onSuccess={fetchEmployees} />
                    <Button variant="outline" size="sm" onClick={handleSyncToUsers} disabled={syncing}>
                        <UserCheck className="h-4 w-4 mr-2" />{syncing ? 'Syncing...' : 'Sync to Users'}
                    </Button>
                    <Button onClick={openCreateModal} data-testid="add-employee-btn">
                        <UserPlus className="h-4 w-4 mr-2" />Add Employee
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-sm text-muted-foreground">Total Employees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.active}</p>
                                <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.probation}</p>
                                <p className="text-sm text-muted-foreground">On Probation</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {employees.filter(e => getDocumentAlertCount(e) > 0).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Doc Expiry Alerts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Input 
                                placeholder="Search by name, ID, email, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full"
                            />
                        </div>
                        <Select value={filterDept} onValueChange={setFilterDept}>
                            <SelectTrigger className="w-[180px]">
                                <Building2 className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[150px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="probation">Probation</SelectItem>
                                <SelectItem value="on_notice">On Notice</SelectItem>
                                <SelectItem value="resigned">Resigned</SelectItem>
                                <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-2" />Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Employee Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Employees ({employees.length})</CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Joining Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Alerts</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees.map((emp) => (
                            <TableRow key={emp.id}>
                                <TableCell className="font-mono font-medium">{emp.employee_id}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{emp.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{emp.company_email}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`capitalize ${emp.gender === 'male' ? 'text-blue-500' : emp.gender === 'female' ? 'text-pink-500' : 'text-muted-foreground'}`}>
                                        {emp.gender || '-'}
                                    </span>
                                </TableCell>
                                <TableCell>{emp.department}</TableCell>
                                <TableCell>{emp.designation}</TableCell>
                                <TableCell>{emp.joining_date}</TableCell>
                                <TableCell>
                                    <Badge className={`${STATUS_COLORS[emp.employment_status] || 'bg-slate-500'} text-white`}>
                                        {emp.employment_status?.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {getDocumentAlertCount(emp) > 0 && (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {getDocumentAlertCount(emp)}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/hr/employees/${emp.id}`)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(emp)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {employees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                    No employees found. Click "Add Employee" to create a new record.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Employee Modal */}
            {showModal && (
                <EmployeeModal
                    open={showModal}
                    onOpenChange={setShowModal}
                    employee={selectedEmployee}
                    onSave={handleSaveEmployee}
                />
            )}
        </div>
    );
};

export default EmployeeMasterPage;
