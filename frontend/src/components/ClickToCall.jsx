import React, { useState } from 'react';
import { Phone, PhoneCall, Copy, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/lib/api';

// 3CX Web Client URL - this should match your 3CX server
const THREECX_WEB_CLIENT = 'https://clt-academy.3cx.ae:5001';

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

    // Clean phone number for 3CX
    const cleanNumber = phoneNumber.replace(/\s+/g, '').replace(/[()-]/g, '');

    const handleCall3CXWebClient = async () => {
        setIsDialing(true);
        
        try {
            // Log the click-to-call attempt in our system
            await api.post('/3cx/click-to-call', null, {
                params: {
                    phone_number: phoneNumber,
                    contact_id: contactId
                }
            });
        } catch (error) {
            console.error('Click-to-call logging error:', error);
        }
        
        // Open 3CX Web Client with the phone number
        const threeCXCallUrl = `${THREECX_WEB_CLIENT}/#/call?phone=${encodeURIComponent(cleanNumber)}`;
        window.open(threeCXCallUrl, '_blank');
        
        toast.success(`Opening 3CX to call ${contactName || phoneNumber}...`, {
            description: 'Click "Call" in the 3CX window',
            duration: 4000
        });
        
        setTimeout(() => setIsDialing(false), 2000);
    };

    const handleCallTelProtocol = async () => {
        setIsDialing(true);
        
        try {
            await api.post('/3cx/click-to-call', null, {
                params: {
                    phone_number: phoneNumber,
                    contact_id: contactId
                }
            });
        } catch (error) {
            console.error('Click-to-call logging error:', error);
        }
        
        // Use tel: protocol - works with 3CX Click2Call extension
        window.location.href = `tel:${cleanNumber}`;
        
        toast.info(`Dialing ${contactName || phoneNumber}...`, {
            description: 'Requires 3CX Click2Call extension',
            duration: 3000
        });
        
        setTimeout(() => setIsDialing(false), 2000);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(phoneNumber);
        toast.success('Phone number copied!');
    };

    return (
        <TooltipProvider>
            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={variant}
                                size={size}
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
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        Click to call: {phoneNumber}
                    </TooltipContent>
                </Tooltip>
                
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleCall3CXWebClient} className="cursor-pointer">
                        <Phone className="mr-2 h-4 w-4 text-green-500" />
                        <span>Call via 3CX Web Client</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCallTelProtocol} className="cursor-pointer">
                        <PhoneCall className="mr-2 h-4 w-4 text-blue-500" />
                        <span>Call via tel: protocol</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Copy number</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                        <Settings className="mr-2 h-3 w-3" />
                        <span>{phoneNumber}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
