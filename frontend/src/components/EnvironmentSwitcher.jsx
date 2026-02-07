import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FlaskConical, TestTube, Rocket } from 'lucide-react';

const EnvironmentSwitcher = () => {
    const [currentMode, setCurrentMode] = useState('production');
    const [userAccess, setUserAccess] = useState(['production']);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        loadEnvironment();
    }, []);

    const loadEnvironment = async () => {
        try {
            const res = await apiClient.get('/environment/current');
            setCurrentMode(res.data.current_mode || 'production');
            setUserAccess(res.data.user_access || ['production']);
        } catch (err) {
            console.error('Failed to fetch environment');
        }
    };

    const handleChange = async (mode) => {
        setSwitching(true);
        try {
            await apiClient.put('/environment/mode?mode=' + mode);
            setCurrentMode(mode);
            toast.success('Switched to ' + mode + ' mode');
        } catch (err) {
            toast.error('Failed to switch environment');
        }
        setSwitching(false);
    };

    const getIcon = (mode) => {
        if (mode === 'development') return FlaskConical;
        if (mode === 'testing') return TestTube;
        return Rocket;
    };

    const getColor = (mode) => {
        if (mode === 'development') return 'bg-purple-500';
        if (mode === 'testing') return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    const canSwitch = userAccess.length > 1;
    const Icon = getIcon(currentMode);

    if (!canSwitch) {
        return (
            <Badge className={getColor(currentMode) + ' text-white gap-1'}>
                <Icon className="h-3 w-3" />
                {currentMode}
            </Badge>
        );
    }

    return (
        <Select value={currentMode} onValueChange={handleChange} disabled={switching}>
            <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {userAccess.map(mode => (
                    <SelectItem key={mode} value={mode}>
                        {mode}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default EnvironmentSwitcher;
