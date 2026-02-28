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
import { Moon, Sun, User, Shield, Bell, Palette, Phone, Download, Copy, ExternalLink, CheckCircle, Volume2, VolumeX, Pencil } from 'lucide-react';
import EditProfileDialog from '@/components/EditProfileDialog';

function getRoleBadgeColor(role) {
    const colors = {
        super_admin: 'bg-purple-600',
        admin: 'bg-indigo-600',
        sales_manager: 'bg-blue-600',
        team_leader: 'bg-cyan-600',
        sales_executive: 'bg-green-600',
        cs_head: 'bg-orange-600',
        cs_agent: 'bg-amber-600',
        mentor: 'bg-pink-600',
        academic_master: 'bg-rose-600',
        finance: 'bg-emerald-600'
    };
    return colors[role] || 'bg-slate-600';
}

function formatRole(role) {
    if (!role) return 'Unknown';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function AdditionalPhonesList({ phones }) {
    if (!phones || phones.length === 0) return null;
    return (
        <div className="mt-2">
            <span className="text-sm text-muted-foreground">Additional Numbers:</span>
            <div className="flex flex-wrap gap-2 mt-1">
                {phones.map((phone, idx) => (
                    <Badge key={`phone-${idx}`} variant="outline">{phone}</Badge>
                ))}
            </div>
        </div>
    );
}

function ProfileCard({ user, onEdit }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <CardTitle>Profile</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={onEdit} data-testid="edit-profile-btn">
                        <Pencil className="h-4 w-4 mr-2" />Edit Profile
                    </Button>
                </div>
                <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    {user?.profile_photo_url ? (
                        <img src={user.profile_photo_url} alt={user.full_name} className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-semibold">{user?.full_name}</h3>
                        <p className="text-muted-foreground">{user?.email}</p>
                        <Badge className={getRoleBadgeColor(user?.role) + ' text-white mt-2'}>{formatRole(user?.role)}</Badge>
                    </div>
                </div>
                {user?.bio && <p className="text-sm text-muted-foreground italic">{user.bio}</p>}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Department:</span><span className="ml-2">{user?.department || 'Not assigned'}</span></div>
                    <div><span className="text-muted-foreground">Region:</span><span className="ml-2">{user?.region || 'Not assigned'}</span></div>
                    <div><span className="text-muted-foreground">Primary Phone:</span><span className="ml-2">{user?.phone || 'Not provided'}</span></div>
                    <div><span className="text-muted-foreground">Status:</span><Badge className="ml-2 bg-emerald-500 text-white">Active</Badge></div>
                </div>
                <AdditionalPhonesList phones={user?.additional_phones} />
            </CardContent>
        </Card>
    );
}

function ThemeCard({ theme, toggleTheme }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2"><Palette className="h-5 w-5" /><CardTitle>Appearance</CardTitle></div>
                <CardDescription>Customize your visual experience</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {theme === 'dark' ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                        <div>
                            <p className="font-medium">{theme === 'dark' ? 'Dark' : 'Light'} Mode</p>
                            <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                        </div>
                    </div>
                    <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} data-testid="theme-toggle" />
                </div>
            </CardContent>
        </Card>
    );
}

function NotificationsCard({ soundEnabled, onToggleSound, savingSound }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2"><Bell className="h-5 w-5" /><CardTitle>Notifications</CardTitle></div>
                <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {soundEnabled ? <Volume2 className="h-5 w-5 text-green-500" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                        <div>
                            <p className="font-medium">Notification Sounds</p>
                            <p className="text-sm text-muted-foreground">Play sound alerts for new notifications</p>
                        </div>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={onToggleSound} disabled={savingSound} data-testid="sound-toggle" />
                </div>
            </CardContent>
        </Card>
    );
}

function IntegrationsCard({ templateData, loading3CX, onFetchTemplate, onDownload, onCopy }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2"><Phone className="h-5 w-5" /><CardTitle>3CX Integration</CardTitle></div>
                <CardDescription>Connect your phone system for click-to-call</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onFetchTemplate} disabled={loading3CX}>
                        {loading3CX ? 'Loading...' : 'View Setup Template'}
                    </Button>
                    <Button variant="outline" onClick={onDownload}><Download className="h-4 w-4 mr-2" />Download</Button>
                </div>
                {templateData && (
                    <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Extension:</span>
                            <code className="bg-background px-2 py-1 rounded">{templateData.extension}</code>
                        </div>
                        <a href="https://www.3cx.com/docs/pbx-integration/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                            <ExternalLink className="h-3 w-3" />View 3CX Integration Guide
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SystemInfoCard() {
    return (
        <Card>
            <CardHeader><CardTitle>System Information</CardTitle><CardDescription>CLT Synapse System</CardDescription></CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Version:</span><span className="ml-2 font-mono">1.0.0</span></div>
                    <div><span className="text-muted-foreground">Environment:</span><Badge variant="outline" className="ml-2">Production</Badge></div>
                    <div><span className="text-muted-foreground">Timezone:</span><span className="ml-2">Asia/Dubai (GST)</span></div>
                    <div><span className="text-muted-foreground">Build:</span><span className="ml-2 font-mono">Phase 1</span></div>
                </div>
            </CardContent>
        </Card>
    );
}

const SettingsPage = () => {
    const { user, refreshUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loading3CX, setLoading3CX] = useState(false);
    const [templateData, setTemplateData] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);
    
    const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('notificationSoundEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [savingSound, setSavingSound] = useState(false);

    const handleToggleSound = async (enabled) => {
        setSavingSound(true);
        setNotificationSoundEnabled(enabled);
        localStorage.setItem('notificationSoundEnabled', JSON.stringify(enabled));
        
        try {
            await api.put('/users/preferences', { notification_sound_enabled: enabled });
            toast.success(enabled ? 'Notification sounds enabled' : 'Notification sounds disabled');
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSavingSound(false);
        }
    };

    const fetch3CXTemplate = async () => {
        setLoading3CX(true);
        try {
            const response = await api.get('/3cx/template');
            setTemplateData(response.data);
        } catch (error) {
            toast.error('Failed to load 3CX template');
        } finally {
            setLoading3CX(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const download3CXTemplate = async () => {
        try {
            const response = await api.get('/3cx/template');
            const data = response.data;
            // Download as XML file for 3CX
            const blob = new Blob([data.template], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'CLT_Synapse_3CX_Template.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('3CX Template downloaded as XML');
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto" data-testid="settings-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <ProfileCard user={user} onEdit={() => setShowEditProfile(true)} />
            <ThemeCard theme={theme} toggleTheme={toggleTheme} />
            <NotificationsCard soundEnabled={notificationSoundEnabled} onToggleSound={handleToggleSound} savingSound={savingSound} />
            <IntegrationsCard templateData={templateData} loading3CX={loading3CX} onFetchTemplate={fetch3CXTemplate} onDownload={download3CXTemplate} onCopy={copyToClipboard} />
            <SystemInfoCard />

            <EditProfileDialog 
                open={showEditProfile} 
                onOpenChange={setShowEditProfile}
                user={user}
                onSuccess={refreshUser}
            />
        </div>
    );
};

export default SettingsPage;
