import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Laptop, RefreshCw, Plus, Check, X, Package, 
    Wrench, AlertTriangle, User, ArrowLeftRight
} from 'lucide-react';

const ASSET_CATEGORIES = [
    { value: 'laptop', label: 'Laptop' },
    { value: 'mobile', label: 'Mobile Phone' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'keyboard', label: 'Keyboard/Mouse' },
    { value: 'headset', label: 'Headset' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'other', label: 'Other' },
];

const STATUS_COLORS = {
    available: 'bg-green-500',
    assigned: 'bg-blue-500',
    under_maintenance: 'bg-amber-500',
    disposed: 'bg-slate-500',
    lost: 'bg-red-500'
};

const AssetsPage = () => {
    const [assets, setAssets] = useState([]);
    const [requests, setRequests] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    const [assetForm, setAssetForm] = useState({
        asset_code: '', asset_name: '', category: 'laptop', brand: '',
        model: '', serial_number: '', purchase_date: '', purchase_price: 0,
        warranty_expiry: '', location: 'Office', condition: 'good', notes: ''
    });
    
    const [assignForm, setAssignForm] = useState({
        employee_id: '', notes: ''
    });

    useEffect(() => {
        fetchData();
    }, [filterCategory, filterStatus]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterCategory && filterCategory !== 'all') params.append('category', filterCategory);
            if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
            
            const [assetsRes, requestsRes, empRes, dashRes] = await Promise.all([
                api.get(`/hr/assets?${params.toString()}`),
                api.get('/hr/assets/requests'),
                api.get('/hr/employees'),
                api.get('/hr/assets/dashboard')
            ]);
            setAssets(assetsRes.data || []);
            setRequests(requestsRes.data || []);
            setEmployees(empRes.data || []);
            setDashboard(dashRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async () => {
        try {
            if (!assetForm.asset_name || !assetForm.category) {
                toast.error('Please fill required fields');
                return;
            }
            await api.post('/hr/assets', assetForm);
            toast.success('Asset created');
            setShowCreateModal(false);
            resetAssetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create asset');
        }
    };

    const handleAssignAsset = async () => {
        try {
            if (!assignForm.employee_id) {
                toast.error('Please select an employee');
                return;
            }
            await api.post(`/hr/assets/${selectedAsset.id}/assign?employee_id=${assignForm.employee_id}${assignForm.notes ? `&notes=${assignForm.notes}` : ''}`);
            toast.success('Asset assigned');
            setShowAssignModal(false);
            setSelectedAsset(null);
            setAssignForm({ employee_id: '', notes: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to assign asset');
        }
    };

    const handleReturnAsset = async (assetId) => {
        try {
            await api.post(`/hr/assets/${assetId}/return?condition=good`);
            toast.success('Asset returned');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to return asset');
        }
    };

    const handleApproveRequest = async (requestId, action, assetId = null) => {
        try {
            let url = `/hr/assets/requests/${requestId}/approve?action=${action}`;
            if (assetId) url += `&asset_id=${assetId}`;
            await api.put(url);
            toast.success(`Request ${action}d`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Action failed');
        }
    };

    const openAssignModal = (asset) => {
        setSelectedAsset(asset);
        setShowAssignModal(true);
    };

    const resetAssetForm = () => {
        setAssetForm({
            asset_code: '', asset_name: '', category: 'laptop', brand: '',
            model: '', serial_number: '', purchase_date: '', purchase_price: 0,
            warranty_expiry: '', location: 'Office', condition: 'good', notes: ''
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount || 0);
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');

    return (
        <div className="space-y-6" data-testid="assets-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
                    <p className="text-muted-foreground">Track and manage company assets</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} data-testid="add-asset-btn">
                        <Plus className="h-4 w-4 mr-2" />Add Asset
                    </Button>
                </div>
            </div>

            {/* Dashboard Cards */}
            {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.summary.total}</p>
                                    <p className="text-sm text-muted-foreground">Total Assets</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                    <Check className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.summary.available}</p>
                                    <p className="text-sm text-muted-foreground">Available</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.summary.assigned}</p>
                                    <p className="text-sm text-muted-foreground">Assigned</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                    <Wrench className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.summary.under_maintenance}</p>
                                    <p className="text-sm text-muted-foreground">Maintenance</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.warranty_expiring}</p>
                                    <p className="text-sm text-muted-foreground">Warranty Expiring</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All Assets</TabsTrigger>
                    <TabsTrigger value="requests">Requests ({pendingRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-4">
                            <CardTitle>Asset Inventory</CardTitle>
                            <div className="flex items-center gap-2">
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {ASSET_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="assigned">Assigned</SelectItem>
                                        <SelectItem value="under_maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Brand/Model</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assets.map((asset) => (
                                    <TableRow key={asset.id}>
                                        <TableCell className="font-mono font-medium">{asset.asset_code}</TableCell>
                                        <TableCell>{asset.asset_name}</TableCell>
                                        <TableCell className="capitalize">{asset.category}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{asset.brand || '-'}</p>
                                                <p className="text-muted-foreground">{asset.model || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {asset.assigned_to_name ? (
                                                <div>
                                                    <p>{asset.assigned_to_name}</p>
                                                    <p className="text-xs text-muted-foreground">{asset.assigned_to_code}</p>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="capitalize">{asset.condition}</TableCell>
                                        <TableCell>
                                            <Badge className={`${STATUS_COLORS[asset.status]} text-white`}>
                                                {asset.status?.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {asset.status === 'available' && (
                                                    <Button size="sm" variant="outline" onClick={() => openAssignModal(asset)}>
                                                        <ArrowLeftRight className="h-4 w-4 mr-1" />Assign
                                                    </Button>
                                                )}
                                                {asset.status === 'assigned' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleReturnAsset(asset.id)}>
                                                        Return
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {assets.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No assets found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Requests</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Requested</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{req.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{req.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{req.department}</TableCell>
                                        <TableCell className="capitalize">{req.asset_category}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant={req.status === 'pending' ? 'default' : 'secondary'}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            {req.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-green-600"
                                                        onClick={() => handleApproveRequest(req.id, 'approve')}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600"
                                                        onClick={() => handleApproveRequest(req.id, 'reject')}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {requests.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No asset requests
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Asset Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add New Asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Asset Code (Auto if empty)</Label>
                                <Input value={assetForm.asset_code} onChange={(e) => setAssetForm({...assetForm, asset_code: e.target.value})} placeholder="AST-0001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={assetForm.category} onValueChange={(v) => setAssetForm({...assetForm, category: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ASSET_CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Asset Name *</Label>
                            <Input value={assetForm.asset_name} onChange={(e) => setAssetForm({...assetForm, asset_name: e.target.value})} placeholder="e.g., Dell Latitude 5520" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Input value={assetForm.brand} onChange={(e) => setAssetForm({...assetForm, brand: e.target.value})} placeholder="e.g., Dell" />
                            </div>
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Input value={assetForm.model} onChange={(e) => setAssetForm({...assetForm, model: e.target.value})} placeholder="e.g., Latitude 5520" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Serial Number</Label>
                            <Input value={assetForm.serial_number} onChange={(e) => setAssetForm({...assetForm, serial_number: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Purchase Date</Label>
                                <Input type="date" value={assetForm.purchase_date} onChange={(e) => setAssetForm({...assetForm, purchase_date: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Purchase Price (AED)</Label>
                                <Input type="number" value={assetForm.purchase_price} onChange={(e) => setAssetForm({...assetForm, purchase_price: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Warranty Expiry</Label>
                                <Input type="date" value={assetForm.warranty_expiry} onChange={(e) => setAssetForm({...assetForm, warranty_expiry: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input value={assetForm.location} onChange={(e) => setAssetForm({...assetForm, location: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select value={assetForm.condition} onValueChange={(v) => setAssetForm({...assetForm, condition: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excellent">Excellent</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea value={assetForm.notes} onChange={(e) => setAssetForm({...assetForm, notes: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateAsset}>Create Asset</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Asset Modal */}
            <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Asset</DialogTitle>
                    </DialogHeader>
                    {selectedAsset && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="font-medium">{selectedAsset.asset_name}</p>
                                <p className="text-sm text-muted-foreground">{selectedAsset.asset_code} - {selectedAsset.category}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Assign to Employee</Label>
                                <Select value={assignForm.employee_id} onValueChange={(v) => setAssignForm({...assignForm, employee_id: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                                    <SelectContent>
                                        {employees.filter(e => e.employment_status === 'active' || e.employment_status === 'probation').map(e => (
                                            <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Textarea value={assignForm.notes} onChange={(e) => setAssignForm({...assignForm, notes: e.target.value})} placeholder="Assignment notes..." />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                        <Button onClick={handleAssignAsset}>Assign</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AssetsPage;
