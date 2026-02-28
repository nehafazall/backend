import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Users,
    Download,
    CheckCircle,
    Clock,
    ArrowRight,
    Loader2,
    RefreshCw,
    Eye,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

export default function MarketingLeadsPage() {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState({});
    const [bulkImporting, setBulkImporting] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [accounts, setAccounts] = useState([]);
    
    // Filters
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [syncedFilter, setSyncedFilter] = useState('all');
    const [page, setPage] = useState(0);
    const pageSize = 25;

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [selectedAccount, syncedFilter, page]);

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/marketing/accounts');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                skip: String(page * pageSize),
                limit: String(pageSize)
            });
            
            if (selectedAccount !== 'all') {
                params.append('account_id', selectedAccount);
            }
            if (syncedFilter !== 'all') {
                params.append('synced_to_crm', syncedFilter === 'synced' ? 'true' : 'false');
            }
            
            const response = await api.get(`/marketing/leads?${params.toString()}`);
            setLeads(response.data.leads);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const handleImportLead = async (leadId) => {
        setImporting(prev => ({ ...prev, [leadId]: true }));
        try {
            await api.post(`/marketing/leads/${leadId}/import`);
            toast.success('Lead imported to CRM');
            fetchLeads();
        } catch (error) {
            console.error('Error importing lead:', error);
            toast.error(error.response?.data?.detail || 'Failed to import lead');
        } finally {
            setImporting(prev => ({ ...prev, [leadId]: false }));
        }
    };

    const handleBulkImport = async () => {
        setBulkImporting(true);
        try {
            const params = selectedAccount !== 'all' ? { account_id: selectedAccount } : {};
            const response = await api.post('/marketing/leads/import-all', params);
            toast.success(response.data.message);
            
            // Refresh after a delay
            setTimeout(() => {
                fetchLeads();
                setBulkImporting(false);
            }, 3000);
        } catch (error) {
            console.error('Error bulk importing:', error);
            toast.error('Failed to start bulk import');
            setBulkImporting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getLeadName = (lead) => {
        const data = lead.lead_data || {};
        return data.full_name || data.name || data.first_name || 'Unknown';
    };

    const getLeadEmail = (lead) => {
        const data = lead.lead_data || {};
        return data.email || '-';
    };

    const getLeadPhone = (lead) => {
        const data = lead.lead_data || {};
        return data.phone_number || data.phone || '-';
    };

    const unsyncedCount = leads.filter(l => !l.synced_to_crm).length;
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6" data-testid="marketing-leads-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Meta Ads Leads</h1>
                    <p className="text-muted-foreground">
                        {total} lead{total !== 1 ? 's' : ''} received from Meta
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setPage(0); }}>
                        <SelectTrigger className="w-[180px]" data-testid="account-filter">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={syncedFilter} onValueChange={(v) => { setSyncedFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-[150px]" data-testid="sync-filter">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Leads</SelectItem>
                            <SelectItem value="unsynced">Not Imported</SelectItem>
                            <SelectItem value="synced">Imported</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button 
                        variant="outline" 
                        onClick={fetchLeads}
                        data-testid="refresh-leads-btn"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    {unsyncedCount > 0 && (
                        <Button 
                            onClick={handleBulkImport}
                            disabled={bulkImporting}
                            data-testid="bulk-import-btn"
                        >
                            {bulkImporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Import All ({unsyncedCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Leads Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Leads
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No leads found</p>
                            <p className="text-sm">Leads will appear here when received from Meta</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead>Form</TableHead>
                                            <TableHead>Received</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.map((lead) => (
                                            <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                                                <TableCell className="font-medium">
                                                    {getLeadName(lead)}
                                                </TableCell>
                                                <TableCell>{getLeadEmail(lead)}</TableCell>
                                                <TableCell>{getLeadPhone(lead)}</TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{lead.campaign_name || '-'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {lead.form_name || lead.form_id || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{formatDate(lead.received_at)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {lead.synced_to_crm ? (
                                                        <Badge className="bg-green-500">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Imported
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setSelectedLead(lead)}
                                                        data-testid={`view-lead-${lead.id}`}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {!lead.synced_to_crm && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleImportLead(lead.id)}
                                                            disabled={importing[lead.id]}
                                                            data-testid={`import-lead-${lead.id}`}
                                                        >
                                                            {importing[lead.id] ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    Import <ArrowRight className="h-4 w-4 ml-1" />
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm">
                                            Page {page + 1} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Lead Details Dialog */}
            <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Lead Details</DialogTitle>
                        <DialogDescription>
                            Received {formatDate(selectedLead?.received_at)}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedLead && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">{getLeadName(selectedLead)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    {selectedLead.synced_to_crm ? (
                                        <Badge className="bg-green-500">Imported</Badge>
                                    ) : (
                                        <Badge variant="outline">Pending</Badge>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p>{getLeadEmail(selectedLead)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p>{getLeadPhone(selectedLead)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Campaign</p>
                                    <p>{selectedLead.campaign_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Form</p>
                                    <p>{selectedLead.form_name || selectedLead.form_id || '-'}</p>
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">All Field Data</p>
                                <div className="bg-muted p-3 rounded-lg overflow-auto max-h-48">
                                    <pre className="text-xs">
                                        {JSON.stringify(selectedLead.lead_data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                            
                            {!selectedLead.synced_to_crm && (
                                <Button 
                                    className="w-full" 
                                    onClick={() => {
                                        handleImportLead(selectedLead.id);
                                        setSelectedLead(null);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Import to CRM
                                </Button>
                            )}
                            
                            {selectedLead.crm_lead_id && (
                                <p className="text-sm text-center text-muted-foreground">
                                    CRM Lead ID: {selectedLead.crm_lead_id}
                                </p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
