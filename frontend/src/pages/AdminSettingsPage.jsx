import React, { useState, useEffect } from 'react';
import api, { useAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { toast } from 'sonner';
import { 
    Trash2, 
    AlertTriangle, 
    Database, 
    Flag, 
    Server, 
    RefreshCw,
    Shield,
    Users,
    FileText,
    DollarSign,
    Phone,
    Calendar,
    CheckCircle,
    XCircle,
    Plus,
    Settings,
    Loader2
} from 'lucide-react';

const ENVIRONMENTS = ['development', 'testing', 'production'];

const AdminSettingsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dataStats, setDataStats] = useState(null);
    const [featureFlags, setFeatureFlags] = useState([]);
    const [environment, setEnvironment] = useState(null);
    
    // Reset dialog state
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetting, setResetting] = useState(false);
    
    // Feature flag dialog state
    const [showFlagDialog, setShowFlagDialog] = useState(false);
    const [newFlag, setNewFlag] = useState({
        name: '',
        display_name: '',
        description: '',
        enabled_environments: ['development']
    });
    
    useEffect(() => {
        fetchData();
    }, []);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, flagsRes, envRes] = await Promise.all([
                api.get('/admin/data-stats'),
                api.get('/admin/feature-flags'),
                api.get('/admin/environment')
            ]);
            setDataStats(statsRes.data);
            setFeatureFlags(flagsRes.data);
            setEnvironment(envRes.data);
        } catch (error) {
            toast.error('Failed to load admin settings');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleResetData = async () => {
        if (resetConfirmText !== 'RESET ALL DATA') {
            toast.error('Please type "RESET ALL DATA" to confirm');
            return;
        }
        
        setResetting(true);
        try {
            const response = await api.post('/admin/reset-data', {
                password: resetPassword,
                confirm_text: resetConfirmText
            });
            toast.success('All data has been reset successfully');
            setShowResetDialog(false);
            setResetPassword('');
            setResetConfirmText('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reset data');
        } finally {
            setResetting(false);
        }
    };
    
    const handleToggleEnvironment = async (flagId, env, currentEnvs) => {
        const newEnvs = currentEnvs.includes(env)
            ? currentEnvs.filter(e => e !== env)
            : [...currentEnvs, env];
        
        try {
            await api.put(`/admin/feature-flags/${flagId}`, {
                enabled_environments: newEnvs
            });
            setFeatureFlags(flags => 
                flags.map(f => f.id === flagId ? { ...f, enabled_environments: newEnvs } : f)
            );
            toast.success('Feature flag updated');
        } catch (error) {
            toast.error('Failed to update feature flag');
        }
    };
    
    const handleCreateFlag = async () => {
        if (!newFlag.name || !newFlag.display_name) {
            toast.error('Please fill in required fields');
            return;
        }
        
        try {
            const response = await api.post('/admin/feature-flags', newFlag);
            setFeatureFlags([...featureFlags, response.data]);
            setShowFlagDialog(false);
            setNewFlag({
                name: '',
                display_name: '',
                description: '',
                enabled_environments: ['development']
            });
            toast.success('Feature flag created');
        } catch (error) {
            toast.error('Failed to create feature flag');
        }
    };
    
    const handleDeleteFlag = async (flagId) => {
        if (!confirm('Are you sure you want to delete this feature flag?')) return;
        
        try {
            await api.delete(`/admin/feature-flags/${flagId}`);
            setFeatureFlags(flags => flags.filter(f => f.id !== flagId));
            toast.success('Feature flag deleted');
        } catch (error) {
            toast.error('Failed to delete feature flag');
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6" data-testid="admin-settings-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-8 w-8 text-purple-500" />
                        Admin Settings
                    </h1>
                    <p className="text-muted-foreground">System administration and environment management</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>
            
            {/* Environment Info */}
            <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-blue-500" />
                        <CardTitle>Current Environment</CardTitle>
                    </div>
                    <CardDescription>Active environment and database configuration</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-background border">
                            <p className="text-sm text-muted-foreground mb-1">Environment</p>
                            <Badge className={
                                environment?.environment === 'production' ? 'bg-red-500' :
                                environment?.environment === 'testing' ? 'bg-amber-500' :
                                'bg-green-500'
                            }>
                                {environment?.environment?.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="p-4 rounded-lg bg-background border">
                            <p className="text-sm text-muted-foreground mb-1">Database</p>
                            <code className="text-sm font-mono">{environment?.database}</code>
                        </div>
                        <div className="p-4 rounded-lg bg-background border">
                            <p className="text-sm text-muted-foreground mb-1">Available Environments</p>
                            <div className="flex gap-1">
                                {environment?.available_environments?.map(env => (
                                    <Badge key={env} variant="outline" className="text-xs">{env}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Data Statistics */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-emerald-500" />
                        <CardTitle>Data Statistics</CardTitle>
                    </div>
                    <CardDescription>Current data counts in {environment?.database}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Super Admins</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.users?.super_admin || 0}</p>
                            <p className="text-xs text-muted-foreground">Protected (won't be deleted)</p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Other Users</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.users?.other_users || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-medium">Leads</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.leads || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium">Students</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.students || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Payments</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.payments || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-pink-500" />
                                <span className="text-sm font-medium">Employees</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.employees || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Phone className="h-4 w-4 text-cyan-500" />
                                <span className="text-sm font-medium">Call Logs</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.call_logs || 0}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">Tasks</span>
                            </div>
                            <p className="text-2xl font-bold">{dataStats?.tasks || 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Data Reset */}
            <Card className="border-red-500/30">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-red-500">Reset All Data</CardTitle>
                    </div>
                    <CardDescription>
                        Clear all data from the current database. Super Admin accounts will be preserved.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-500">Warning: This action cannot be undone!</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This will permanently delete all leads, students, payments, employees, attendance records,
                                    call logs, tasks, and all other data. Only Super Admin user accounts will be kept.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="destructive" 
                        onClick={() => setShowResetDialog(true)}
                        data-testid="reset-data-btn"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset All Data
                    </Button>
                </CardContent>
            </Card>
            
            {/* Feature Flags */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Flag className="h-5 w-5 text-amber-500" />
                            <CardTitle>Feature Flags</CardTitle>
                        </div>
                        <Button onClick={() => setShowFlagDialog(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Flag
                        </Button>
                    </div>
                    <CardDescription>
                        Enable or disable features per environment. Toggle which features are available in Development, Testing, and Production.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted rounded-lg text-sm font-medium">
                            <div className="col-span-4">Feature</div>
                            <div className="col-span-2 text-center">Development</div>
                            <div className="col-span-2 text-center">Testing</div>
                            <div className="col-span-2 text-center">Production</div>
                            <div className="col-span-2 text-center">Actions</div>
                        </div>
                        
                        {/* Flag rows */}
                        {featureFlags.map(flag => (
                            <div key={flag.id} className="grid grid-cols-12 gap-4 px-4 py-3 border rounded-lg items-center">
                                <div className="col-span-4">
                                    <p className="font-medium">{flag.display_name}</p>
                                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                                    <code className="text-xs bg-muted px-1 rounded">{flag.name}</code>
                                </div>
                                {ENVIRONMENTS.map(env => (
                                    <div key={env} className="col-span-2 flex justify-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={flag.enabled_environments?.includes(env) 
                                                ? 'text-green-500 hover:text-green-600' 
                                                : 'text-muted-foreground hover:text-foreground'}
                                            onClick={() => handleToggleEnvironment(flag.id, env, flag.enabled_environments || [])}
                                        >
                                            {flag.enabled_environments?.includes(env) 
                                                ? <CheckCircle className="h-5 w-5" />
                                                : <XCircle className="h-5 w-5" />
                                            }
                                        </Button>
                                    </div>
                                ))}
                                <div className="col-span-2 flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleDeleteFlag(flag.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        
                        {featureFlags.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No feature flags configured. Click "Add Flag" to create one.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            
            {/* Reset Data Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Data Reset
                        </DialogTitle>
                        <DialogDescription>
                            This action will permanently delete all data except Super Admin accounts.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm font-medium text-red-500">The following will be deleted:</p>
                            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                                <li>All users (except Super Admins)</li>
                                <li>All leads and students</li>
                                <li>All payments and commissions</li>
                                <li>All employees and HR data</li>
                                <li>All call logs and activities</li>
                                <li>All finance data</li>
                            </ul>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Enter your password to confirm</Label>
                            <Input
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                placeholder="Your password"
                                data-testid="reset-password-input"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Type <code className="bg-muted px-1 rounded">RESET ALL DATA</code> to confirm</Label>
                            <Input
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                placeholder="RESET ALL DATA"
                                data-testid="reset-confirm-input"
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleResetData}
                            disabled={resetting || resetConfirmText !== 'RESET ALL DATA'}
                            data-testid="confirm-reset-btn"
                        >
                            {resetting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Reset All Data
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Create Feature Flag Dialog */}
            <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Feature Flag</DialogTitle>
                        <DialogDescription>
                            Add a new feature flag to control feature availability per environment.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Flag Name (code) *</Label>
                            <Input
                                value={newFlag.name}
                                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                placeholder="my_feature"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Display Name *</Label>
                            <Input
                                value={newFlag.display_name}
                                onChange={(e) => setNewFlag({ ...newFlag, display_name: e.target.value })}
                                placeholder="My Feature"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newFlag.description}
                                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                                placeholder="What this feature does..."
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Enabled Environments</Label>
                            <div className="flex gap-4">
                                {ENVIRONMENTS.map(env => (
                                    <label key={env} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={newFlag.enabled_environments.includes(env)}
                                            onCheckedChange={(checked) => {
                                                const envs = checked
                                                    ? [...newFlag.enabled_environments, env]
                                                    : newFlag.enabled_environments.filter(e => e !== env);
                                                setNewFlag({ ...newFlag, enabled_environments: envs });
                                            }}
                                        />
                                        <span className="text-sm capitalize">{env}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFlag}>
                            Create Flag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminSettingsPage;
