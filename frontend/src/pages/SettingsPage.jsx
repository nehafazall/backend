import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useTheme } from '@/lib/api';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Moon, Sun, User, Shield, Bell, Palette, Phone, Download, Copy, ExternalLink, CheckCircle, Volume2, VolumeX, Pencil, Plus, X, Camera, Save } from 'lucide-react';

const SettingsPage = () => {
    const { user, refreshUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [loading3CX, setLoading3CX] = useState(false);
    const [templateData, setTemplateData] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);
    
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        phone: '',
        additional_phones: [],
        bio: '',
        profile_photo_url: ''
    });
    
    const [newPhone, setNewPhone] = useState('');
    
    // Notification sound settings
    const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('notificationSoundEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [savingSound, setSavingSound] = useState(false);
    
    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                phone: user.phone || '',
                additional_phones: user.additional_phones || [],
                bio: user.bio || '',
                profile_photo_url: user.profile_photo_url || ''
            });
        }
    }, [user]);
    
    const handleOpenEditProfile = () => {
        setProfileForm({
            full_name: user?.full_name || '',
            phone: user?.phone || '',
            additional_phones: user?.additional_phones || [],
            bio: user?.bio || '',
            profile_photo_url: user?.profile_photo_url || ''
        });
        setShowEditProfile(true);
    };
    
    const handleAddPhone = () => {
        if (!newPhone.trim()) return;
        if (profileForm.additional_phones.includes(newPhone.trim())) {
            toast.error('Phone number already added');
            return;
        }
        setProfileForm(prev => ({
            ...prev,
            additional_phones: [...prev.additional_phones, newPhone.trim()]
        }));
        setNewPhone('');
    };
    
    const handleRemovePhone = (phone) => {
        setProfileForm(prev => ({
            ...prev,
            additional_phones: prev.additional_phones.filter(p => p !== phone)
        }));
    };
    
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            toast.error('Invalid file type. Use JPEG, PNG, GIF or WebP');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File too large. Maximum 2MB');
            return;
        }
        
        // Convert to base64 for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setProfileForm(prev => ({
                ...prev,
                profile_photo_url: e.target.result
            }));
        };
        reader.readAsDataURL(file);
    };
    
    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            await api.put('/users/me/profile', {
                full_name: profileForm.full_name,
                phone: profileForm.phone,
                additional_phones: profileForm.additional_phones,
                bio: profileForm.bio,
                profile_photo_url: profileForm.profile_photo_url
            });
            toast.success('Profile updated successfully');
            setShowEditProfile(false);
            if (refreshUser) refreshUser();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Handle notification sound toggle
    const handleNotificationSoundToggle = async (enabled) => {
        setNotificationSoundEnabled(enabled);
        localStorage.setItem('notificationSoundEnabled', JSON.stringify(enabled));
        
        setSavingSound(true);
        try {
            await api.put('/users/preferences', { notification_sound_enabled: enabled });
            toast.success(enabled ? 'Notification sounds enabled' : 'Notification sounds disabled');
        } catch (error) {
            console.error('Failed to save sound preference:', error);
            // Still works locally even if backend sync fails
        } finally {
            setSavingSound(false);
        }
    };

    // Test notification sound
    const playTestSound = (type) => {
        const sounds = {
            notification: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1cXWBhZ3F7hY2VnKGlo6GdlpCLhoOBf35+f4GDh4uQlZqeoKCfnZqXk5CLiIaDgYB/f4CBg4aJjZGVmZudn56cmpiVkY6LiIaDgYB/f4CBgoWIi4+SlZiampubnJuamJaUkY6LiYeEgoGAgICBgoSGiYuOkJKUlZaXl5eXlpWUkpCOjImHhYOCgYGBgYKDhYeJi42PkJGSk5OTk5OSkZCPjYuJh4WEgoKBgYGCg4SFh4iKi4yNjo6Ojo6NjYyLioiHhoWEg4KCgoKCg4OEhYaHiImKioqLi4uKiomJiIeGhYWEg4ODg4ODg4OEhIWFhoaGh4eHh4eHhoaFhYWEhISEhISEhISEhIWFhYWFhYWFhYWFhYWFhYSEhISEhISEhISEhISEhIWFhYWFhYWFhYWFhQ==',
            lead: 'data:audio/wav;base64,UklGRl9JAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTtJAAD//wIA/f8EAPz/BgD7/wgA+v8KAPn/DAD4/w4A9/8QAPX/EgD0/xQA8/8WAPD/GADv/xoA7f8cAOz/HgDq/yAA6P8iAOb/JADk/yYA4v8oAOD/KgDd/ywA2/8uANn/MADWyzIA1P80ANH/NgDO/zgAy/86AMj/PADG/z4Aw/9AAMD/QgC9/0QAuv9GALf/SAC0/0oAsP9MAK3/TgCq/1AAp/9SAKT/VACV/1YAlv9YAI3/WgCK/1wAgf9eAH7/YAB7/2IAeP9kAHP/ZgBw/2gAav9qAGX/bABi/24AX/9wAFn/cgBW/3QAU/92AFD/eABM/3oASP98AEX/fgBC/4AAPv+CADv/hAA3/4YAMP+IACz/igAp/4wAJv+OACL/kAAf/5IAHP+UABj/lgAV/5gAEv+aAA7/nAAL/54AB/+gAAT/ogAA/6QA/f6mAPn+qAD2/qoA8v6sAO/+rgDr/rAA6P6yAOT+tADh/rYA3f64ANr+ugDW/rwA0/6+AM/+wADM/sIAyP7EAMP+xgC//sgAu/7KALj+zAC0/s4AsP7QALL+kgCr/tQAp/7WAKr/2ACg/9oAnf/cAJn/3gCW/+AAs/+6AJD/5ACN/+YAif/oAIX/6gCA/+wAfP/uAHr/8ABw//IAaf/0AGf/9gBk//gAYP/6AF3//ABa/wABWf8CAVb/BAFUzwYBUv8IAVD/CgFM/wwBS/8OAUL/EAFA/xIBPv8UAT3/FgE7/xgBOP8aATf/HAE0/x4BM/8gATD/IgEv/yQBLv8mASz/KAEs/yoBLP8sASv/LgEr/zABLP8yAS3/NAEu/zYBLv84ATD/OgEw/zwBMf8+ATL/QAE0/0IBNf9EATX/RgE2/0gBN/9KATj/TAE4/04BOf9QATr/UgE6/1QBO/9WATz/WAE8/1oBPf9cAT7/XgE+/2ABQf9iAUH/ZAFEz2YBRf9oAUf/agFI/2wBSv9uAUv/cAFN/3IBUP90AVH/dgFT/3gBVf96AVj/fAFa/34BXf+AAWD/ggFi/4QBZf+GAWj/iAFq/4oBbv+MAW//jgFy/5ABdf+SAXP/lAF6/5YBff+YAX7/mgGA/5wBhP+eAYf/oAGK/6IBjP+kAZD/pgGS/6gBlf+qAZj/rAGa/64Bnf+wAZ//sgGj/7QBpv+2Aan/uAGr/7oBr/+8AbH/vgG0/8ABt//CAbv/xAG9/8YBwf/IAcP/ygHG/8wByP/OAcv/0AHO/9IB0f/UAdP/1gHV/9gB2P/aAdr/3AHd/94B4P/gAeL/4gHl/+QB6P/mAev/6AHt/+oB8P/sAfP/7gH1//AB+P/yAfr/9AH9//YB///4AQIA+gEFAPwBBwD+AQoAAAENAAIBEAAEARIABgEVAAgBFwAKARoADAEcAA4BHwAQASEAEgEkABQBJgAWASkAGAErABoBLgAbATAAHQEzAB8BNQAhATgAIwE6ACQBPQA='
        };
        const audio = new Audio(sounds[type]);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    };

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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            <CardTitle>Profile</CardTitle>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleOpenEditProfile} data-testid="edit-profile-btn">
                            <Pencil className="h-4 w-4 mr-2" />Edit Profile
                        </Button>
                    </div>
                    <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {user?.profile_photo_url ? (
                                <img 
                                    src={user.profile_photo_url} 
                                    alt={user.full_name}
                                    className="w-20 h-20 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold">{user?.full_name}</h3>
                            <p className="text-muted-foreground">{user?.email}</p>
                            <Badge className={`${getRoleBadgeColor(user?.role)} text-white mt-2`}>
                                {formatRole(user?.role)}
                            </Badge>
                        </div>
                    </div>
                    
                    {user?.bio && (
                        <p className="text-sm text-muted-foreground italic">{user.bio}</p>
                    )}
                    
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
                            <span className="text-muted-foreground">Primary Phone:</span>
                            <span className="ml-2">{user?.phone || 'Not provided'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className="ml-2 bg-emerald-500 text-white">Active</Badge>
                        </div>
                    </div>
                    
                    {user?.additional_phones && user.additional_phones.length > 0 && (
                        <div className="mt-2">
                            <span className="text-sm text-muted-foreground">Additional Numbers:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {user.additional_phones.map((phone, idx) => (
                                    <Badge key={idx} variant="outline">{phone}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
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

            {/* Notification Settings Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        <CardTitle>Notification Settings</CardTitle>
                    </div>
                    <CardDescription>Control notification sounds and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {notificationSoundEnabled ? (
                                <Volume2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <VolumeX className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <Label>Notification Sounds</Label>
                                <p className="text-sm text-muted-foreground">
                                    Play sounds when new notifications arrive
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={notificationSoundEnabled}
                            onCheckedChange={handleNotificationSoundToggle}
                            disabled={savingSound}
                            data-testid="notification-sound-switch"
                        />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Test Notification Sounds</Label>
                        <div className="flex gap-3">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => playTestSound('notification')}
                                data-testid="test-notification-sound"
                            >
                                <Bell className="h-4 w-4 mr-2" />
                                General Alert
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => playTestSound('lead')}
                                data-testid="test-lead-sound"
                            >
                                <Phone className="h-4 w-4 mr-2" />
                                New Lead Alert
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Different sounds play for new leads vs. general notifications (e.g., SLA warnings, reminders)
                        </p>
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
                                            onClick={() => copyToClipboard(templateData.template)}
                                        >
                                            <Copy className="h-4 w-4 mr-1" />
                                            Copy XML
                                        </Button>
                                    </div>
                                    <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-64 border">
                                        {templateData.template?.slice(0, 1500)}...
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
                    <CardDescription>CLT Synapse System</CardDescription>
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
            
            {/* Edit Profile Dialog */}
            <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Update your profile information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Profile Photo */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                {profileForm.profile_photo_url ? (
                                    <img 
                                        src={profileForm.profile_photo_url} 
                                        alt="Profile"
                                        className="w-24 h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                                        {profileForm.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />
                            <p className="text-xs text-muted-foreground">Click camera to upload photo (max 2MB)</p>
                        </div>
                        
                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input 
                                value={profileForm.full_name}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Your full name"
                            />
                        </div>
                        
                        {/* Primary Phone */}
                        <div className="space-y-2">
                            <Label>Primary Phone</Label>
                            <Input 
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+971 XX XXX XXXX"
                            />
                        </div>
                        
                        {/* Additional Phones */}
                        <div className="space-y-2">
                            <Label>Additional Phone Numbers</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    placeholder="Add another number"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPhone())}
                                />
                                <Button type="button" variant="outline" onClick={handleAddPhone}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {profileForm.additional_phones.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {profileForm.additional_phones.map((phone, idx) => (
                                        <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                                            {phone}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                                onClick={() => handleRemovePhone(phone)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Bio */}
                        <div className="space-y-2">
                            <Label>Bio (Optional)</Label>
                            <Textarea 
                                value={profileForm.bio}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                placeholder="A short bio about yourself"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
                        <Button onClick={handleSaveProfile} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SettingsPage;
