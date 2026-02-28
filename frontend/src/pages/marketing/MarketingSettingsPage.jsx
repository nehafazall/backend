import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Link2,
    Link2Off,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Settings,
    Globe,
    Loader2,
    Facebook,
    Copy,
} from 'lucide-react';

export default function MarketingSettingsPage() {
    const { user } = useAuth();
    const [config, setConfig] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState({});
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchAccounts();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/marketing/config');
            setConfig(response.data);
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/marketing/accounts');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('Failed to load connected accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectMeta = async () => {
        setConnecting(true);
        try {
            const response = await api.post('/marketing/oauth/start');
            const { oauth_url } = response.data;
            
            // Open OAuth URL in new window
            window.open(oauth_url, '_blank', 'width=600,height=700');
            
            toast.info('Complete the authorization in the popup window');
            
            // Poll for new accounts (simple approach)
            setTimeout(() => {
                fetchAccounts();
                setConnecting(false);
            }, 10000);
        } catch (error) {
            console.error('Error starting OAuth:', error);
            toast.error(error.response?.data?.detail || 'Failed to start Meta connection');
            setConnecting(false);
        }
    };

    const handleSyncAccount = async (accountId) => {
        setSyncing(prev => ({ ...prev, [accountId]: true }));
        try {
            await api.post(`/marketing/accounts/${accountId}/sync`);
            toast.success('Sync started. Data will be updated shortly.');
            
            // Refresh after delay
            setTimeout(() => {
                fetchAccounts();
            }, 5000);
        } catch (error) {
            console.error('Error syncing account:', error);
            toast.error('Failed to sync account');
        } finally {
            setSyncing(prev => ({ ...prev, [accountId]: false }));
        }
    };

    const handleDisconnectAccount = async (accountId) => {
        try {
            await api.delete(`/marketing/accounts/${accountId}`);
            toast.success('Account disconnected');
            fetchAccounts();
        } catch (error) {
            console.error('Error disconnecting account:', error);
            toast.error('Failed to disconnect account');
        }
    };

    const copyWebhookUrl = () => {
        if (config?.webhook_url) {
            navigator.clipboard.writeText(config.webhook_url);
            toast.success('Webhook URL copied to clipboard');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500">Active</Badge>;
            case 'expired':
                return <Badge variant="destructive">Token Expired</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            case 'disabled':
                return <Badge variant="secondary">Disabled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="marketing-settings-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Marketing Settings</h1>
                    <p className="text-muted-foreground">Connect and manage your Meta Ads accounts</p>
                </div>
            </div>

            {/* Configuration Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuration Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Facebook className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="font-medium">Meta API</p>
                                <p className="text-sm text-muted-foreground">
                                    {config?.meta_configured ? 'Configured' : 'Not configured'}
                                </p>
                            </div>
                            {config?.meta_configured ? (
                                <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-500 ml-auto" />
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                            <Globe className="h-5 w-5 text-purple-500" />
                            <div>
                                <p className="font-medium">Webhook</p>
                                <p className="text-sm text-muted-foreground">
                                    {config?.webhook_configured ? 'Ready' : 'Not ready'}
                                </p>
                            </div>
                            {config?.webhook_configured ? (
                                <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-500 ml-auto" />
                            )}
                        </div>
                    </div>

                    {!config?.meta_configured && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Meta API Not Configured</AlertTitle>
                            <AlertDescription>
                                Add META_APP_ID and META_APP_SECRET to your environment variables to enable Meta Ads integration.
                                <br />
                                <a 
                                    href="https://developers.facebook.com/apps" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                                >
                                    Go to Meta Developers <ExternalLink className="h-3 w-3" />
                                </a>
                            </AlertDescription>
                        </Alert>
                    )}

                    {config?.webhook_url && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm font-medium mb-2">Webhook URL (for Meta App)</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-slate-200 dark:bg-slate-700 p-2 rounded overflow-x-auto">
                                    {config.webhook_url}
                                </code>
                                <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" />
                            Connected Ad Accounts
                        </CardTitle>
                        <CardDescription>
                            {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
                        </CardDescription>
                    </div>
                    <Button 
                        onClick={handleConnectMeta}
                        disabled={!config?.meta_configured || connecting}
                        data-testid="connect-meta-btn"
                    >
                        {connecting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Facebook className="h-4 w-4 mr-2" />
                        )}
                        Connect Meta Account
                    </Button>
                </CardHeader>
                <CardContent>
                    {accounts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Link2Off className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No accounts connected yet</p>
                            <p className="text-sm">Click "Connect Meta Account" to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Account ID</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Synced</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow key={account.id} data-testid={`account-row-${account.id}`}>
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {account.meta_account_id}
                                            </code>
                                        </TableCell>
                                        <TableCell>{account.currency || '-'}</TableCell>
                                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                                        <TableCell>
                                            {account.last_synced 
                                                ? new Date(account.last_synced).toLocaleString() 
                                                : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleSyncAccount(account.id)}
                                                disabled={syncing[account.id]}
                                                data-testid={`sync-account-${account.id}`}
                                            >
                                                <RefreshCw className={`h-4 w-4 ${syncing[account.id] ? 'animate-spin' : ''}`} />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        size="sm" 
                                                        variant="destructive"
                                                        data-testid={`disconnect-account-${account.id}`}
                                                    >
                                                        <Link2Off className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove the connection to "{account.name}" and delete all synced campaigns and leads from this account.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDisconnectAccount(account.id)}>
                                                            Disconnect
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Setup Instructions */}
            {!config?.meta_configured && (
                <Card>
                    <CardHeader>
                        <CardTitle>Setup Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ol className="list-decimal list-inside space-y-3 text-sm">
                            <li>
                                Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a>
                            </li>
                            <li>Create a new app or select an existing one</li>
                            <li>Go to App Settings &gt; Basic to get your App ID and App Secret</li>
                            <li>Add the "Marketing API" product to your app</li>
                            <li>
                                Add the following redirect URI to your app settings:
                                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                                    {config?.webhook_url?.replace('/webhook', '/oauth/callback')}
                                </code>
                            </li>
                            <li>
                                Add your credentials to the backend .env file:
                                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                                    META_APP_ID=your_app_id<br />
                                    META_APP_SECRET=your_app_secret
                                </code>
                            </li>
                            <li>Restart the backend service</li>
                        </ol>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
