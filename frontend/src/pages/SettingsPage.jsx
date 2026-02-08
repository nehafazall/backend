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
