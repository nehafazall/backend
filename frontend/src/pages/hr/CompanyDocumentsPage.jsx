import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    FolderOpen,
    Plus,
    Upload,
    Calendar,
    AlertTriangle,
    FileText,
    Download,
    Trash2,
    Edit,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    RefreshCw,
} from 'lucide-react';

const DOCUMENT_TYPES = [
    { value: 'trade_license', label: 'Trade License' },
    { value: 'establishment_card', label: 'Establishment Card' },
    { value: 'immigration_card', label: 'Immigration Card' },
    { value: 'chamber_certificate', label: 'Chamber of Commerce Certificate' },
    { value: 'tax_registration', label: 'Tax Registration Certificate' },
    { value: 'insurance_certificate', label: 'Insurance Certificate' },
    { value: 'lease_agreement', label: 'Lease Agreement' },
    { value: 'moa_aoa', label: 'MOA/AOA' },
    { value: 'power_of_attorney', label: 'Power of Attorney' },
    { value: 'bank_guarantee', label: 'Bank Guarantee' },
    { value: 'contract', label: 'Contract/Agreement' },
    { value: 'other', label: 'Other' },
];

const CompanyDocumentsPage = () => {
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [filteredDocs, setFilteredDocs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        document_type: '',
        document_name: '',
        description: '',
        document_number: '',
        issue_date: '',
        expiry_date: '',
        issuing_authority: '',
        document_url: '',
        reminder_days: 30,
    });

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/hr/company-documents');
            setDocuments(res.data);
        } catch (error) {
            toast.error('Failed to fetch documents');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        let filtered = documents;
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(d => 
                d.document_name?.toLowerCase().includes(q) ||
                d.document_number?.toLowerCase().includes(q) ||
                d.description?.toLowerCase().includes(q)
            );
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(d => d.document_type === typeFilter);
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => getDocStatus(d) === statusFilter);
        }
        
        setFilteredDocs(filtered);
    }, [documents, searchQuery, typeFilter, statusFilter]);

    const getDocStatus = (doc) => {
        if (!doc.expiry_date) return 'no_expiry';
        const today = new Date();
        const expiry = new Date(doc.expiry_date);
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= (doc.reminder_days || 30)) return 'expiring_soon';
        return 'valid';
    };

    const getStatusBadge = (doc) => {
        const status = getDocStatus(doc);
        switch (status) {
            case 'expired':
                return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Expired</Badge>;
            case 'expiring_soon':
                return <Badge className="bg-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Expiring Soon</Badge>;
            case 'valid':
                return <Badge className="bg-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Valid</Badge>;
            default:
                return <Badge variant="outline">No Expiry</Badge>;
        }
    };

    const getDaysUntilExpiry = (doc) => {
        if (!doc.expiry_date) return null;
        const today = new Date();
        const expiry = new Date(doc.expiry_date);
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    };

    const getDocTypeName = (type) => {
        return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
    };

    const resetForm = () => {
        setFormData({
            document_type: '',
            document_name: '',
            description: '',
            document_number: '',
            issue_date: '',
            expiry_date: '',
            issuing_authority: '',
            document_url: '',
            reminder_days: 30,
        });
    };

    const handleAdd = () => {
        resetForm();
        setShowAddModal(true);
    };

    const handleEdit = (doc) => {
        setSelectedDoc(doc);
        setFormData({
            document_type: doc.document_type || '',
            document_name: doc.document_name || '',
            description: doc.description || '',
            document_number: doc.document_number || '',
            issue_date: doc.issue_date || '',
            expiry_date: doc.expiry_date || '',
            issuing_authority: doc.issuing_authority || '',
            document_url: doc.document_url || '',
            reminder_days: doc.reminder_days || 30,
        });
        setShowEditModal(true);
    };

    const handleDelete = (doc) => {
        setSelectedDoc(doc);
        setShowDeleteDialog(true);
    };

    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!formData.document_type || !formData.document_name) {
            toast.error('Please fill in required fields');
            return;
        }
        
        setSubmitting(true);
        try {
            await apiClient.post('/hr/company-documents', formData);
            toast.success('Document added successfully');
            setShowAddModal(false);
            fetchDocuments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add document');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        if (!formData.document_type || !formData.document_name) {
            toast.error('Please fill in required fields');
            return;
        }
        
        setSubmitting(true);
        try {
            await apiClient.put(`/hr/company-documents/${selectedDoc.id}`, formData);
            toast.success('Document updated successfully');
            setShowEditModal(false);
            fetchDocuments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update document');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await apiClient.delete(`/hr/company-documents/${selectedDoc.id}`);
            toast.success('Document deleted successfully');
            setShowDeleteDialog(false);
            fetchDocuments();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete document');
        }
    };

    // Stats
    const totalDocs = documents.length;
    const expiredDocs = documents.filter(d => getDocStatus(d) === 'expired').length;
    const expiringDocs = documents.filter(d => getDocStatus(d) === 'expiring_soon').length;

    return (
        <div className="space-y-6" data-testid="company-documents-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FolderOpen className="h-6 w-6 text-primary" />
                        Company Documents
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage company licenses, certificates, and important documents
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchDocuments}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleAdd} data-testid="add-document-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalDocs}</p>
                                <p className="text-xs text-muted-foreground">Total Documents</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className={expiredDocs > 0 ? 'border-red-500/50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/20">
                                <XCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-500">{expiredDocs}</p>
                                <p className="text-xs text-muted-foreground">Expired</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className={expiringDocs > 0 ? 'border-amber-500/50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-500">{expiringDocs}</p>
                                <p className="text-xs text-muted-foreground">Expiring Soon</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-500">
                                    {totalDocs - expiredDocs - expiringDocs}
                                </p>
                                <p className="text-xs text-muted-foreground">Valid</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="search-documents"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Document Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="valid">Valid</SelectItem>
                        <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="no_expiry">No Expiry</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Documents Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-12">
                            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No documents found</p>
                            <Button variant="outline" className="mt-4" onClick={handleAdd}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Document
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Document</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Document No.</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocs.map((doc) => {
                                    const daysUntil = getDaysUntilExpiry(doc);
                                    return (
                                        <TableRow key={doc.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{doc.document_name}</p>
                                                    {doc.issuing_authority && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Issued by: {doc.issuing_authority}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getDocTypeName(doc.document_type)}</TableCell>
                                            <TableCell>{doc.document_number || '-'}</TableCell>
                                            <TableCell>
                                                {doc.expiry_date ? (
                                                    <div>
                                                        <p>{new Date(doc.expiry_date).toLocaleDateString()}</p>
                                                        {daysUntil !== null && (
                                                            <p className={`text-xs ${daysUntil < 0 ? 'text-red-500' : daysUntil <= 30 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                                                {daysUntil < 0 
                                                                    ? `${Math.abs(daysUntil)} days overdue` 
                                                                    : `${daysUntil} days remaining`
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(doc)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {doc.document_url && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => window.open(doc.document_url, '_blank')}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(doc)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(doc)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
                if (!open) {
                    setShowAddModal(false);
                    setShowEditModal(false);
                }
            }}>
                <DialogContent className="max-w-xl" data-testid="document-form-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5 text-primary" />
                            {showAddModal ? 'Add New Document' : 'Edit Document'}
                        </DialogTitle>
                        <DialogDescription>
                            {showAddModal ? 'Add a new company document' : 'Update document details'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={showAddModal ? handleSubmitAdd : handleSubmitEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Document Type *</Label>
                                <Select 
                                    value={formData.document_type} 
                                    onValueChange={(v) => setFormData({...formData, document_type: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Document Name *</Label>
                                <Input
                                    value={formData.document_name}
                                    onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                                    placeholder="e.g., Trade License 2024"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Document Number</Label>
                                <Input
                                    value={formData.document_number}
                                    onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                                    placeholder="e.g., TL-2024-12345"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Issuing Authority</Label>
                                <Input
                                    value={formData.issuing_authority}
                                    onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                                    placeholder="e.g., DED Dubai"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Issue Date</Label>
                                <Input
                                    type="date"
                                    value={formData.issue_date}
                                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiry Date</Label>
                                <Input
                                    type="date"
                                    value={formData.expiry_date}
                                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Reminder Days Before Expiry</Label>
                                <Input
                                    type="number"
                                    value={formData.reminder_days}
                                    onChange={(e) => setFormData({...formData, reminder_days: parseInt(e.target.value) || 30})}
                                    min={1}
                                    max={365}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Document URL</Label>
                                <Input
                                    value={formData.document_url}
                                    onChange={(e) => setFormData({...formData, document_url: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Additional notes about this document..."
                                rows={2}
                            />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => {
                                setShowAddModal(false);
                                setShowEditModal(false);
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : showAddModal ? 'Add Document' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedDoc?.document_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CompanyDocumentsPage;
