import React, { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Save, Plus, X } from 'lucide-react';

function PhoneBadge({ phone, onRemove }) {
    return (
        <Badge variant="secondary" className="gap-1 pr-1">
            {phone}
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                onClick={onRemove}
            >
                <X className="h-3 w-3" />
            </Button>
        </Badge>
    );
}

function PhoneList({ phones, onRemove }) {
    if (!phones || phones.length === 0) return null;
    
    const items = [];
    for (let i = 0; i < phones.length; i++) {
        items.push(
            <PhoneBadge key={i} phone={phones[i]} onRemove={() => onRemove(phones[i])} />
        );
    }
    
    return <div className="flex flex-wrap gap-2 mt-2">{items}</div>;
}

const EditProfileDialog = ({ open, onOpenChange, user, onSuccess }) => {
    const fileInputRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [additionalPhones, setAdditionalPhones] = useState([]);
    const [bio, setBio] = useState('');
    const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
    
    useEffect(() => {
        if (user && open) {
            setFullName(user.full_name || '');
            setPhone(user.phone || '');
            setAdditionalPhones(user.additional_phones || []);
            setBio(user.bio || '');
            setProfilePhotoUrl(user.profile_photo_url || '');
        }
    }, [user, open]);
    
    const handleAddPhone = () => {
        if (!newPhone.trim()) return;
        if (additionalPhones.includes(newPhone.trim())) {
            toast.error('Phone number already added');
            return;
        }
        setAdditionalPhones([...additionalPhones, newPhone.trim()]);
        setNewPhone('');
    };
    
    const handleRemovePhone = (phoneToRemove) => {
        setAdditionalPhones(additionalPhones.filter(p => p !== phoneToRemove));
    };
    
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            toast.error('Invalid file type. Use JPEG, PNG, GIF or WebP');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File too large. Maximum 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            setProfilePhotoUrl(evt.target.result);
        };
        reader.readAsDataURL(file);
    };
    
    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put('/users/me/profile', {
                full_name: fullName,
                phone: phone,
                additional_phones: additionalPhones,
                bio: bio,
                profile_photo_url: profilePhotoUrl
            });
            toast.success('Profile updated successfully');
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>Update your profile information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            {profilePhotoUrl ? (
                                <img src={profilePhotoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                                    {fullName?.charAt(0) || 'U'}
                                </div>
                            )}
                            <Button variant="outline" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="h-4 w-4" />
                            </Button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhotoUpload} />
                        <p className="text-xs text-muted-foreground">Click camera to upload photo (max 2MB)</p>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Primary Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 XX XXX XXXX" />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Additional Phone Numbers</Label>
                        <div className="flex gap-2">
                            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Add another number" />
                            <Button type="button" variant="outline" onClick={handleAddPhone}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <PhoneList phones={additionalPhones} onRemove={handleRemovePhone} />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Bio (Optional)</Label>
                        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself" rows={3} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileDialog;
