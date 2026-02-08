import React, { useState } from 'react';
import { useAuth, useTheme } from '@/lib/api';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Moon, Sun, User, Shield, Bell, Palette, Phone, Download, Copy, ExternalLink, CheckCircle } from 'lucide-react';

const SettingsPage = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loading3CX, setLoading3CX] = useState(false);
    const [templateData, setTemplateData] = useState(null);

    const formatRole = (role) => {
        return role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            super_admin: 'bg-purple-500',
            admin: 'bg-blue-500',
            sales_manager: 'bg-green-500',
            team_leader: 'bg-cyan-500',
            sales_executive: 'bg-yellow-500',
            cs_head: 'bg-pink-500',
            cs_agent: 'bg-indigo-500',
            mentor: 'bg-orange-500',
            finance: 'bg-emerald-500',
            hr: 'bg-rose-500',
        };
        return colors[role] || 'bg-slate-500';
    };

    const fetch3CXTemplate = async () => {
        setLoading3CX(true);
        try {
            const response = await api.get('/3cx/template');
            setTemplateData(response.data);
        } catch (error) {
            toast.error('Failed to fetch 3CX template');
            console.error(error);
        } finally {
            setLoading3CX(false);
        }
    };

    const download3CXTemplate = () => {
        if (!templateData?.template) {
            toast.error('Please fetch the template first');
            return;
        }
        const blob = new Blob([templateData.template], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CLT_Academy_3CX_CRM_Template.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Template downloaded!');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="space-y-6 max-w-4xl" data-testid="settings-page">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            {/* Profile Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <CardTitle>Profile</CardTitle>
                    </div>
                    <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold">{user?.full_name}</h3>
                            <p className="text-muted-foreground">{user?.email}</p>
                            <Badge className={`${getRoleBadgeColor(user?.role)} text-white mt-2`}>
                                {formatRole(user?.role)}
                            </Badge>
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Department:</span>
                            <span className="ml-2">{user?.department || 'Not assigned'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Region:</span>
                            <span className="ml-2">{user?.region || 'Not assigned'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="ml-2">{user?.phone || 'Not provided'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className="ml-2 bg-emerald-500 text-white">Active</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Appearance Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        <CardTitle>Appearance</CardTitle>
                    </div>
                    <CardDescription>Customize how the application looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {theme === 'dark' ? (
                                <Moon className="h-5 w-5" />
                            ) : (
                                <Sun className="h-5 w-5" />
                            )}
                            <div>
                                <Label>Dark Mode</Label>
                                <p className="text-sm text-muted-foreground">
                                    Toggle between light and dark theme
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={theme === 'dark'}
                            onCheckedChange={toggleTheme}
                            data-testid="theme-switch"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Permissions Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <CardTitle>Permissions</CardTitle>
                    </div>
                    <CardDescription>Your access level and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <span>Sales CRM Access</span>
                            {['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'].includes(user?.role) ? (
                                <Badge className="bg-emerald-500 text-white">Granted</Badge>
                            ) : (
                                <Badge variant="secondary">Denied</Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-2">
                            <span>Customer Service Access</span>
                            {['super_admin', 'admin', 'cs_head', 'cs_agent'].includes(user?.role) ? (
                                <Badge className="bg-emerald-500 text-white">Granted</Badge>
                            ) : (
                                <Badge variant="secondary">Denied</Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-2">
                            <span>Mentor CRM Access</span>
                            {['super_admin', 'admin', 'mentor'].includes(user?.role) ? (
                                <Badge className="bg-emerald-500 text-white">Granted</Badge>
                            ) : (
                                <Badge variant="secondary">Denied</Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-2">
                            <span>Finance Access</span>
                            {['super_admin', 'admin', 'finance'].includes(user?.role) ? (
                                <Badge className="bg-emerald-500 text-white">Granted</Badge>
                            ) : (
                                <Badge variant="secondary">Denied</Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between py-2">
                            <span>User Management</span>
                            {['super_admin', 'admin'].includes(user?.role) ? (
                                <Badge className="bg-emerald-500 text-white">Granted</Badge>
                            ) : (
                                <Badge variant="secondary">Denied</Badge>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3CX Phone Integration Section - Only for admins */}
            {['super_admin', 'admin'].includes(user?.role) && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            <CardTitle>3CX Phone Integration</CardTitle>
                        </div>
                        <CardDescription>Configure your 3CX phone system integration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Setup Instructions</h4>
                            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                <li>Click "Fetch Template" to generate your CRM integration XML</li>
                                <li>Download the XML file</li>
                                <li>Go to your 3CX Management Console → Integrations → CRM</li>
                                <li>Upload the downloaded XML template</li>
                                <li>Enable the integration and test with a sample call</li>
                            </ol>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={fetch3CXTemplate} 
                                disabled={loading3CX}
                                data-testid="fetch-3cx-template-btn"
                            >
                                {loading3CX ? 'Fetching...' : 'Fetch Template'}
                            </Button>
                            
                            {templateData && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        onClick={download3CXTemplate}
                                        data-testid="download-3cx-template-btn"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download XML
                                    </Button>
                                    <a 
                                        href="https://clt-academy.3cx.ae:5001/#/office/integrations/crm" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    >
                                        <Button variant="outline">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open 3CX Console
                                        </Button>
                                    </a>
                                </>
                            )}
                        </div>

                        {templateData && (
                            <div className="space-y-4 mt-4">
                                <Separator />
                                
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                        Template Generated Successfully
                                    </span>
                                </div>

                                {/* API Endpoints */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Available API Endpoints</Label>
                                    <div className="space-y-2 text-sm">
                                        {templateData.endpoints && Object.entries(templateData.endpoints).map(([key, url]) => (
                                            <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                                                <div>
                                                    <span className="font-mono text-xs text-muted-foreground">{key}:</span>
                                                    <span className="ml-2 font-mono text-xs">{url}</span>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => copyToClipboard(url)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* XML Preview */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">XML Template Preview</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => copyToClipboard(templateData.xml_template)}
                                        >
                                            <Copy className="h-4 w-4 mr-1" />
                                            Copy XML
                                        </Button>
                                    </div>
                                    <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-64 border">
                                        {templateData.xml_template?.slice(0, 1500)}...
                                    </pre>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* System Info */}
            <Card>
                <CardHeader>
                    <CardTitle>System Information</CardTitle>
                    <CardDescription>CLT Academy ERP System</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Version:</span>
                            <span className="ml-2 font-mono">1.0.0</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Environment:</span>
                            <Badge variant="outline" className="ml-2">Production</Badge>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Timezone:</span>
                            <span className="ml-2">Asia/Dubai (GST)</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Build:</span>
                            <span className="ml-2 font-mono">Phase 1</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsPage;
