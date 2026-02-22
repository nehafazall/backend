import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    RefreshCw, 
    Cloud, 
    CheckCircle, 
    AlertTriangle, 
    Link2, 
    Unlink,
    Download,
    Users,
    Fingerprint,
    Search
} from 'lucide-react';

const BioCloudSyncPage = () => {
    const [status, setStatus] = useState(null);
    const [bioCloudEmployees, setBioCloudEmployees] = useState([]);
    const [cltEmployees, setCltEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [fetchingAttendance, setFetchingAttendance] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [selectedBioEmployee, setSelectedBioEmployee] = useState(null);
    const [pendingMappings, setPendingMappings] = useState([]);

    useEffect(() => {
        fetchStatus();
        fetchEmployees();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/hr/biocloud/status');
            setStatus(response.data);
        } catch (error) {
            toast.error('Failed to get BioCloud status');
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hr/biocloud/employees');
            if (response.data.success) {
                setBioCloudEmployees(response.data.biocloud_employees || []);
                setCltEmployees(response.data.clt_employees || []);
            }
        } catch (error) {
            toast.error('Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoSync = async () => {
        try {
            setSyncing(true);
            const response = await api.post('/hr/biocloud/auto-sync');
            toast.success(response.data.message);
            fetchStatus();
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Auto-sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const handleFetchAttendance = async () => {
        try {
            setFetchingAttendance(true);
            const response = await api.post(`/hr/biocloud/fetch-attendance?date=${selectedDate}`);
            toast.success(response.data.message);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to fetch attendance');
        } finally {
            setFetchingAttendance(false);
        }
    };

    const handleManualMap = (bioEmployee) => {
        setSelectedBioEmployee(bioEmployee);
        setShowMappingModal(true);
    };

    const handleSelectCltEmployee = (cltEmployeeId) => {
        if (!selectedBioEmployee) return;
        
        // Add to pending mappings
        const newMapping = {
            biocloud_emp_code: selectedBioEmployee.emp_code,
            biocloud_name: selectedBioEmployee.name,
            clt_employee_id: cltEmployeeId,
            clt_name: cltEmployees.find(e => e.id === cltEmployeeId)?.name
        };
        
        setPendingMappings([...pendingMappings.filter(m => m.biocloud_emp_code !== selectedBioEmployee.emp_code), newMapping]);
        setShowMappingModal(false);
        setSelectedBioEmployee(null);
    };

    const handleSaveMappings = async () => {
        if (pendingMappings.length === 0) {
            toast.error('No mappings to save');
            return;
        }
        
        try {
            setSyncing(true);
            const response = await api.post('/hr/biocloud/mapping', pendingMappings);
            toast.success(response.data.message);
            setPendingMappings([]);
            fetchStatus();
            fetchEmployees();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save mappings');
        } finally {
            setSyncing(false);
        }
    };

    const filteredBioEmployees = bioCloudEmployees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.emp_code?.includes(searchTerm) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const mappedCount = bioCloudEmployees.filter(e => e.mapped_to).length;
    const unmappedCount = bioCloudEmployees.length - mappedCount;

    return (
        <div className="space-y-6" data-testid="biocloud-sync-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BioCloud Integration</h1>
                    <p className="text-muted-foreground">Sync attendance data from ZK BioCloud biometric system</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { fetchStatus(); fetchEmployees(); }}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${status?.connected ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                <Cloud className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-lg font-bold">{status?.connected ? 'Connected' : 'Disconnected'}</p>
                                <p className="text-sm text-muted-foreground">BioCloud Status</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <Fingerprint className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{bioCloudEmployees.length}</p>
                                <p className="text-sm text-muted-foreground">BioCloud Employees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <Link2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{mappedCount}</p>
                                <p className="text-sm text-muted-foreground">Mapped</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <Unlink className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{unmappedCount}</p>
                                <p className="text-sm text-muted-foreground">Unmapped</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="mapping" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="mapping">Employee Mapping</TabsTrigger>
                    <TabsTrigger value="sync">Attendance Sync</TabsTrigger>
                </TabsList>

                <TabsContent value="mapping" className="space-y-4">
                    {/* Actions Bar */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <Button onClick={handleAutoSync} disabled={syncing}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                    Auto-Sync by Name
                                </Button>
                                {pendingMappings.length > 0 && (
                                    <Button onClick={handleSaveMappings} variant="default" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Save {pendingMappings.length} Mapping(s)
                                    </Button>
                                )}
                                <div className="flex-1" />
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search employees..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 w-64"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employee Mapping Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>BioCloud Employees</CardTitle>
                            <CardDescription>Map BioCloud employees to CLT Synapse employee records</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <ScrollArea className="h-[500px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Emp Code</TableHead>
                                                <TableHead>Name (BioCloud)</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Position</TableHead>
                                                <TableHead>Mapped To</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBioEmployees.map((emp) => {
                                                const pendingMap = pendingMappings.find(m => m.biocloud_emp_code === emp.emp_code);
                                                return (
                                                    <TableRow key={emp.id}>
                                                        <TableCell className="font-mono">{emp.emp_code}</TableCell>
                                                        <TableCell>{emp.name}</TableCell>
                                                        <TableCell>{emp.department}</TableCell>
                                                        <TableCell>{emp.position}</TableCell>
                                                        <TableCell>
                                                            {emp.mapped_to ? (
                                                                <Badge className="bg-green-500 text-white">
                                                                    {emp.mapped_to.employee_id} - {emp.mapped_to.name}
                                                                </Badge>
                                                            ) : pendingMap ? (
                                                                <Badge className="bg-amber-500 text-white">
                                                                    Pending: {pendingMap.clt_name}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-muted-foreground">
                                                                    Not Mapped
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {!emp.mapped_to && (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm"
                                                                    onClick={() => handleManualMap(emp)}
                                                                >
                                                                    <Link2 className="h-4 w-4 mr-1" />
                                                                    Map
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sync" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fetch Attendance from BioCloud</CardTitle>
                            <CardDescription>Sync daily attendance data from biometric devices</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Date</label>
                                    <Input 
                                        type="date" 
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-48"
                                    />
                                </div>
                                <div className="pt-6">
                                    <Button 
                                        onClick={handleFetchAttendance} 
                                        disabled={fetchingAttendance || unmappedCount === bioCloudEmployees.length}
                                    >
                                        <Download className={`h-4 w-4 mr-2 ${fetchingAttendance ? 'animate-bounce' : ''}`} />
                                        {fetchingAttendance ? 'Fetching...' : 'Fetch Attendance'}
                                    </Button>
                                </div>
                            </div>
                            
                            {unmappedCount === bioCloudEmployees.length && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span className="font-medium">No employees mapped yet</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Please map BioCloud employees to CLT Synapse employees first before fetching attendance.
                                    </p>
                                </div>
                            )}

                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <h4 className="font-medium text-blue-600 mb-2">How it works:</h4>
                                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                    <li>BioCloud employees punch in/out using fingerprint at the device</li>
                                    <li>Data syncs to BioCloud server (https://56.biocloud.me:8085)</li>
                                    <li>Click "Fetch Attendance" to pull first-in/last-out times for mapped employees</li>
                                    <li>Attendance records are created/updated in CLT Synapse with late/early detection</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Manual Mapping Modal */}
            <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Map BioCloud Employee</DialogTitle>
                    </DialogHeader>
                    
                    {selectedBioEmployee && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">BioCloud Employee:</p>
                                <p className="font-medium">{selectedBioEmployee.name}</p>
                                <p className="text-sm">Code: {selectedBioEmployee.emp_code} | Dept: {selectedBioEmployee.department}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Select CLT Synapse Employee:</p>
                                <ScrollArea className="h-64 border rounded-lg">
                                    {cltEmployees.filter(e => !e.has_mapping).map((emp) => (
                                        <div 
                                            key={emp.id}
                                            className="p-3 hover:bg-muted cursor-pointer border-b"
                                            onClick={() => handleSelectCltEmployee(emp.id)}
                                        >
                                            <p className="font-medium">{emp.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {emp.employee_id} | {emp.department}
                                            </p>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMappingModal(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BioCloudSyncPage;
