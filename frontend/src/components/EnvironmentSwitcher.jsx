import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
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

const envConfig = {
    development: { label: 'Development', icon: FlaskConical, color: 'bg-purple-500' },
    testing: { label: 'Testing', icon: TestTube, color: 'bg-yellow-500' },
    production: { label: 'Production', icon: Rocket, color: 'bg-emerald-500' }
};

const EnvironmentSwitcher = () => {
    const { user } = useAuth();
    const [envData, setEnvData] = useState(null);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        fetchEnvironment();
    }, []);

    const fetchEnvironment = async () => {
        try {
            const res = await apiClient.get('/environment/current');
            setEnvData(res.data);
        } catch (err) {
            console.error('Failed to fetch environment');
        }
    };

    const handleChange = async (mode) => {
        setSwitching(true);
        try {
            await apiClient.put('/environment/mode?mode=' + mode);
            setEnvData(prev => ({ ...prev, current_mode: mode }));
            toast.success('Switched to ' + envConfig[mode].label + ' mode');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to switch environment');
        }
        setSwitching(false);
    };

    if (!envData) return null;

    const canSwitch = envData.user_access.length > 1 || user?.role === 'super_admin';
    const currentConfig = envConfig[envData.current_mode] || envConfig.production;
    const Icon = currentConfig.icon;

    if (!canSwitch) {
        return (
            <Badge className={currentConfig.color + ' text-white gap-1'}>
                <Icon className="h-3 w-3" />
                {currentConfig.label}
            </Badge>
        );
    }

    return (
        <Select value={envData.current_mode} onValueChange={handleChange} disabled={switching}>
            <SelectTrigger className="w-[150px] h-8">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <SelectValue />
                </div>
            </SelectTrigger>
            <SelectContent>
                {envData.user_access.map(mode => {
                    const config = envConfig[mode];
                    const ModeIcon = config.icon;
                    return (
                        <SelectItem key={mode} value={mode}>
                            <div className="flex items-center gap-2">
                                <ModeIcon className="h-4 w-4" />
                                {config.label}
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
};

export default EnvironmentSwitcher;
