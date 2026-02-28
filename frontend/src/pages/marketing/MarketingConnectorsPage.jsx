import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Plus,
    RefreshCw,
    Link2,
    Trash2,
    Settings,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    FileSpreadsheet,
    ExternalLink,
    Eye,
    Loader2,
    AlertCircle,
} from 'lucide-react';

const DEFAULT_COLUMN_MAPPING = {
    full_name: 'N',
    city: 'O',
    phone: 'P',
    secondary_phone: 'Q',
    captured_time: 'B'
};

export default function MarketingConnectorsPage() {
    const [connectors, setConnectors] = useState([]);
    const [agents, setAgents] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState({});
    
    // Dialog states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedConnector, setSelectedConnector] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        sheet_url: '',
        sheet_name: 'Sheet1',
        assigned_agent_ids: [],
        auto_sync_enabled: true,
        sync_interval_minutes: 5,
        column_mapping: { ...DEFAULT_COLUMN_MAPPING }
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [configRes, connectorsRes, agentsRes] = await Promise.all([
                api.get('/connectors/config'),
                api.get('/connectors/google-sheets'),
                api.get('/connectors/agents')
            ]);
            setConfig(configRes.data);
            setConnectors(connectorsRes.data);
            setAgents(agentsRes.data);
        } catch (err) {
            toast.error('Failed to load connectors');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateConnector = async () => {
        if (!formData.name || !formData.sheet_url || formData.assigned_agent_ids.length === 0) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            await api.post('/connectors/google-sheets', formData);
            toast.success('Connector created! Now connect it to Google.');
            setShowAddDialog(false);
            resetForm();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create connector');
        }
    };

    const handleUpdateConnector = async () => {
        if (!selectedConnector) return;
        
        try {
            await api.put(`/connectors/google-sheets/${selectedConnector.id}`, {
                name: formData.name,
                sheet_name: formData.sheet_name,
                assigned_agent_ids: formData.assigned_agent_ids,
                auto_sync_enabled: formData.auto_sync_enabled,
                sync_interval_minutes: formData.sync_interval_minutes,
                column_mapping: formData.column_mapping
            });
            toast.success('Connector updated');
            setShowEditDialog(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update connector');
        }
    };

    const handleDeleteConnector = async () => {
        if (!selectedConnector) return;
        
        try {
            await api.delete(`/connectors/google-sheets/${selectedConnector.id}`);
            toast.success('Connector deleted');
            setShowDeleteDialog(false);
            setSelectedConnector(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete connector');
        }
    };

    const handleConnectOAuth = async (connector) => {
        try {
            const res = await api.get(`/connectors/google-sheets/${connector.id}/oauth`);
            // Open OAuth URL in new window
            window.open(res.data.auth_url, '_blank', 'width=600,height=700');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to start OAuth');
        }
    };

    const handleSyncNow = async (connector) => {
        setSyncing(prev => ({ ...prev, [connector.id]: true }));
        try {
            await api.post(`/connectors/google-sheets/${connector.id}/sync`);
            toast.success('Sync started');
            // Refresh after a short delay
            setTimeout(fetchData, 3000);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to sync');
        } finally {
            setSyncing(prev => ({ ...prev, [connector.id]: false }));
        }
    };

    const handlePreview = async (connector) => {
        setSelectedConnector(connector);
        setPreviewData(null);
        setShowPreviewDialog(true);
        
        try {
            const res = await api.get(`/connectors/google-sheets/${connector.id}/preview`);
            setPreviewData(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to preview data');
            setShowPreviewDialog(false);
        }
    };

    const openEditDialog = (connector) => {
        setSelectedConnector(connector);
        setFormData({
            name: connector.name,
            sheet_url: connector.sheet_url,
            sheet_name: connector.sheet_name,
            assigned_agent_ids: connector.assigned_agent_ids || [],
            auto_sync_enabled: connector.auto_sync_enabled,
            sync_interval_minutes: connector.sync_interval_minutes || 5,
            column_mapping: connector.column_mapping || DEFAULT_COLUMN_MAPPING
        });
        setShowEditDialog(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sheet_url: '',
            sheet_name: 'Sheet1',
            assigned_agent_ids: [],
            auto_sync_enabled: true,
            sync_interval_minutes: 5,
            column_mapping: { ...DEFAULT_COLUMN_MAPPING }
        });
    };

    const toggleAgentSelection = (agentId) => {
        setFormData(prev => {
            const ids = prev.assigned_agent_ids;
            if (ids.includes(agentId)) {
                return { ...prev, assigned_agent_ids: ids.filter(id => id !== agentId) };
            }
            return { ...prev, assigned_agent_ids: [...ids, agentId] };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="marketing-connectors-page">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Lead Connectors</h1>
                    <p className="text-muted-foreground">
                        Connect Google Sheets and other sources to automatically import leads
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} data-testid="refresh-connectors-btn">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="add-connector-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Connector
                    </Button>
                </div>
            </div>

            {/* Configuration Status */}
            {config && !config.google_sheets_configured && (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <div>
                            <p className="font-medium">Google Sheets Not Configured</p>
                            <p className="text-sm text-muted-foreground">
                                Add GOOGLE_SHEETS_CLIENT_ID and GOOGLE_SHEETS_CLIENT_SECRET to the backend .env file to enable Google Sheets connectors.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Connectors List */}
            {connectors.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Connectors Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Add a Google Sheet connector to start importing leads automatically.
                        </p>
                        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Connector
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {connectors.map(connector => (
                        <Card key={connector.id} data-testid={`connector-card-${connector.id}`}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connector.is_connected ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                            <FileSpreadsheet className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {connector.name}
                                                {connector.is_connected ? (
                                                    <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Not Connected
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <a 
                                                    href={connector.sheet_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline flex items-center"
                                                >
                                                    View Sheet <ExternalLink className="h-3 w-3 ml-1" />
                                                </a>
                                                <span className="text-muted-foreground">•</span>
                                                <span>Sheet: {connector.sheet_name}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!connector.is_connected && (
                                            <Button 
                                                variant="default" 
                                                size="sm"
                                                onClick={() => handleConnectOAuth(connector)}
                                                data-testid={`connect-oauth-${connector.id}`}
                                            >
                                                <Link2 className="h-4 w-4 mr-1" />
                                                Connect
                                            </Button>
                                        )}
                                        {connector.is_connected && (
                                            <>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handlePreview(connector)}
                                                    data-testid={`preview-${connector.id}`}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Preview
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleSyncNow(connector)}
                                                    disabled={syncing[connector.id]}
                                                    data-testid={`sync-${connector.id}`}
                                                >
                                                    {syncing[connector.id] ? (
                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-4 w-4 mr-1" />
                                                    )}
                                                    Sync Now
                                                </Button>
                                            </>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => openEditDialog(connector)}
                                            data-testid={`edit-${connector.id}`}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => { setSelectedConnector(connector); setShowDeleteDialog(true); }}
                                            data-testid={`delete-${connector.id}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Assigned Agents</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            {connector.assigned_agent_names?.length || 0} agent(s)
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {connector.assigned_agent_names?.join(', ') || 'None'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Auto Sync</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {connector.auto_sync_enabled ? `Every ${connector.sync_interval_minutes} min` : 'Disabled'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Last Sync</p>
                                        <p className="font-medium">
                                            {connector.last_synced_at 
                                                ? new Date(connector.last_synced_at).toLocaleString() 
                                                : 'Never'}
                                        </p>
                                        {connector.last_sync && (
                                            <p className="text-xs text-muted-foreground">
                                                {connector.last_sync.new_leads || 0} new, {connector.last_sync.duplicates_skipped || 0} skipped
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Assignment Mode</p>
                                        <p className="font-medium">
                                            {connector.assigned_agent_ids?.length > 1 ? 'Round Robin' : 'Single Agent'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Connector Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Google Sheet Connector</DialogTitle>
                        <DialogDescription>
                            Connect a Google Sheet to automatically import leads into the Leads Pool.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Connector Name *</Label>
                            <Input 
                                id="name"
                                placeholder="e.g. Facebook Leads Sheet"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                data-testid="connector-name-input"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sheet_url">Google Sheet URL *</Label>
                            <Input 
                                id="sheet_url"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                value={formData.sheet_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, sheet_url: e.target.value }))}
                                data-testid="sheet-url-input"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sheet_name">Sheet Tab Name</Label>
                            <Input 
                                id="sheet_name"
                                placeholder="Sheet1"
                                value={formData.sheet_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                                data-testid="sheet-name-input"
                            />
                        </div>
                        <div>
                            <Label>Assign Leads To *</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Select one agent for all leads, or multiple for round-robin distribution.
                            </p>
                            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                {agents.map(agent => (
                                    <label 
                                        key={agent.id} 
                                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                    >
                                        <input 
                                            type="checkbox"
                                            checked={formData.assigned_agent_ids.includes(agent.id)}
                                            onChange={() => toggleAgentSelection(agent.id)}
                                            className="rounded"
                                        />
                                        <span>{agent.full_name}</span>
                                        <Badge variant="outline" className="text-xs ml-auto">{agent.role}</Badge>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto Sync</Label>
                                <p className="text-xs text-muted-foreground">Automatically sync every 5 minutes</p>
                            </div>
                            <Switch 
                                checked={formData.auto_sync_enabled}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_sync_enabled: checked }))}
                            />
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                            <Label className="text-xs">Default Column Mapping</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                                N = Full Name, O = City, P = Primary Phone, Q = Secondary Phone, B = Captured Time
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateConnector} data-testid="create-connector-btn">
                            Create Connector
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Connector Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Connector</DialogTitle>
                        <DialogDescription>
                            Update connector settings. Sheet URL cannot be changed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit_name">Connector Name</Label>
                            <Input 
                                id="edit_name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit_sheet_name">Sheet Tab Name</Label>
                            <Input 
                                id="edit_sheet_name"
                                value={formData.sheet_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Assign Leads To</Label>
                            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                {agents.map(agent => (
                                    <label 
                                        key={agent.id} 
                                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                    >
                                        <input 
                                            type="checkbox"
                                            checked={formData.assigned_agent_ids.includes(agent.id)}
                                            onChange={() => toggleAgentSelection(agent.id)}
                                            className="rounded"
                                        />
                                        <span>{agent.full_name}</span>
                                        <Badge variant="outline" className="text-xs ml-auto">{agent.role}</Badge>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto Sync</Label>
                            </div>
                            <Switch 
                                checked={formData.auto_sync_enabled}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_sync_enabled: checked }))}
                            />
                        </div>
                        <div>
                            <Label>Sync Interval (minutes)</Label>
                            <Select 
                                value={String(formData.sync_interval_minutes)}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, sync_interval_minutes: parseInt(val) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">Every 5 minutes</SelectItem>
                                    <SelectItem value="10">Every 10 minutes</SelectItem>
                                    <SelectItem value="15">Every 15 minutes</SelectItem>
                                    <SelectItem value="30">Every 30 minutes</SelectItem>
                                    <SelectItem value="60">Every hour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Column Mapping</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {Object.entries(formData.column_mapping).map(([field, col]) => (
                                    <div key={field} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground capitalize w-24">
                                            {field.replace('_', ' ')}:
                                        </span>
                                        <Input 
                                            value={col}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                column_mapping: { ...prev.column_mapping, [field]: e.target.value.toUpperCase() }
                                            }))}
                                            className="w-16 text-center"
                                            maxLength={2}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleUpdateConnector}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Sheet Preview</DialogTitle>
                        <DialogDescription>
                            First 10 rows from the connected Google Sheet
                        </DialogDescription>
                    </DialogHeader>
                    {!previewData ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {previewData.rows?.[0]?.map((_, idx) => (
                                            <TableHead key={idx} className="text-center min-w-[80px]">
                                                {String.fromCharCode(65 + idx)}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.rows?.map((row, rowIdx) => (
                                        <TableRow key={rowIdx}>
                                            {row.map((cell, cellIdx) => (
                                                <TableCell key={cellIdx} className="text-sm truncate max-w-[150px]">
                                                    {cell}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium">Column Mapping:</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {previewData.column_mapping && Object.entries(previewData.column_mapping).map(([field, col]) => (
                                        <Badge key={field} variant="outline">
                                            {col} = {field.replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Connector?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the connector "{selectedConnector?.name}". 
                            Existing leads that were imported will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConnector}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
