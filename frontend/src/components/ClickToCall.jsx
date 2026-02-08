import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import api from '@/lib/api';

/**
 * Click-to-Call Button Component
 * Integrates with 3CX phone system for making calls
 * 
 * Usage:
 * <ClickToCall phoneNumber="+971501234567" contactId="uuid" contactName="John Doe" />
 */
export function ClickToCall({ 
    phoneNumber, 
    contactId = null, 
    contactName = null,
    variant = "ghost",
    size = "icon",
    showLabel = false,
    className = ""
}) {
    const [isDialing, setIsDialing] = useState(false);

    if (!phoneNumber) return null;

    const handleClick = async () => {
        setIsDialing(true);
        
        try {
            // Log the click-to-call attempt in our system
            await api.post('/3cx/click-to-call', null, {
                params: {
                    phone_number: phoneNumber,
                    contact_id: contactId
                }
            });
            
            // Open 3CX click-to-call protocol
            // This will trigger the 3CX desktop or web app
            const threeCXUrl = `tel:${phoneNumber}`;
            window.open(threeCXUrl, '_self');
            
            // Also try the 3CX specific protocol
            setTimeout(() => {
                window.open(`callto:${phoneNumber}`, '_self');
            }, 100);
            
            toast.success(`Calling ${contactName || phoneNumber}...`, {
                description: 'Connect via your 3CX client',
                duration: 3000
            });
            
        } catch (error) {
            console.error('Click-to-call error:', error);
            // Still try to make the call even if logging fails
            window.open(`tel:${phoneNumber}`, '_self');
            toast.info(`Dialing ${phoneNumber}...`);
        } finally {
            setTimeout(() => setIsDialing(false), 2000);
        }
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(phoneNumber);
        toast.success('Phone number copied!');
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={variant}
                        size={size}
                        onClick={handleClick}
                        disabled={isDialing}
                        className={`${className} ${isDialing ? 'animate-pulse' : ''}`}
                        data-testid="click-to-call-btn"
                    >
                        {isDialing ? (
                            <PhoneCall className="h-4 w-4 text-green-500 animate-bounce" />
                        ) : (
                            <Phone className="h-4 w-4" />
                        )}
                        {showLabel && (
                            <span className="ml-2">{isDialing ? 'Calling...' : 'Call'}</span>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                    <span>Click to call: {phoneNumber}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleCopy}
                    >
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Call History Display Component
 */
export function CallHistory({ contactId, className = "" }) {
    const [calls, setCalls] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!contactId) return;
        
        const fetchCalls = async () => {
            try {
                const response = await api.get(`/3cx/call-history/${contactId}`);
                setCalls(response.data.calls || []);
            } catch (error) {
                console.error('Error fetching call history:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchCalls();
    }, [contactId]);

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading calls...</div>;
    }

    if (calls.length === 0) {
        return <div className="text-sm text-muted-foreground">No call history</div>;
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <h4 className="text-sm font-medium">Recent Calls</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
                {calls.slice(0, 10).map((call) => (
                    <div 
                        key={call.call_id} 
                        className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                    >
                        <div className="flex items-center gap-2">
                            {call.call_direction === 'Inbound' ? (
                                <PhoneCall className="h-3 w-3 text-blue-500" />
                            ) : (
                                <Phone className="h-3 w-3 text-green-500" />
                            )}
                            <span className={call.call_type === 'Missed' ? 'text-red-500' : ''}>
                                {call.call_direction} {call.call_type === 'Missed' && '(Missed)'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{formatDuration(call.call_duration)}</span>
                            <span>{formatDate(call.call_date)}</span>
                            {call.recording_url && (
                                <a 
                                    href={call.recording_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    🎵
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ClickToCall;
