import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Play,
    Star,
    ExternalLink,
    Clock,
    User,
    FileAudio,
    CheckCircle,
    AlertCircle,
    Filter,
    RefreshCw,
} from 'lucide-react';

const QCDashboardPage = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [threecxRecordingsUrl, setThreecxRecordingsUrl] = useState('');
    
    // QC Form state
    const [qcForm, setQcForm] = useState({
        recording_url: '',
        qc_rating: 0,
        qc_notes: '',
        qc_status: 'reviewed'
    });

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const response = await api.get('/3cx/calls/qc-queue', { params });
            setCalls(response.data.calls || []);
            setThreecxRecordingsUrl(response.data.threecx_recordings_url || '');
        } catch (error) {
            console.error('Error fetching calls:', error);
            toast.error('Failed to load calls');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, [statusFilter]);

    const handleOpenReview = (call) => {
        setSelectedCall(call);
        setQcForm({
            recording_url: call.recording_url || '',
            qc_rating: call.qc_rating || 0,
            qc_notes: call.qc_notes || '',
            qc_status: call.qc_status || 'pending'
        });
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedCall) return;
        
        try {
            await api.put(`/3cx/calls/${selectedCall.call_id}/qc`, qcForm);
            toast.success('QC review saved successfully');
            setShowReviewModal(false);
            fetchCalls();
        } catch (error) {
            console.error('Error saving QC review:', error);
            toast.error('Failed to save review');
        }
    };

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

    const getCallIcon = (callType, direction) => {
        if (callType === 'Missed') return <PhoneMissed className="h-4 w-4 text-red-500" />;
        if (direction === 'Inbound') return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
        return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'reviewed':
                return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Reviewed</Badge>;
            case 'flagged':
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Flagged</Badge>;
            default:
                return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pending</Badge>;
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6" data-testid="qc-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">QC Dashboard</h1>
                    <p className="text-muted-foreground">Review call recordings and rate call quality</p>
                </div>
                <div className="flex items-center gap-3">
                    <a 
                        href={threecxRecordingsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex"
                    >
                        <Button variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open 3CX Recordings
                        </Button>
                    </a>
                    <Button onClick={fetchCalls} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                <Clock className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Review</p>
                                <p className="text-2xl font-bold">
                                    {calls.filter(c => !c.qc_status || c.qc_status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Reviewed</p>
                                <p className="text-2xl font-bold">
                                    {calls.filter(c => c.qc_status === 'reviewed').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Flagged</p>
                                <p className="text-2xl font-bold">
                                    {calls.filter(c => c.qc_status === 'flagged').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Phone className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Calls</p>
                                <p className="text-2xl font-bold">{calls.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Label>Status:</Label>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Calls</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="flagged">Flagged</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Calls Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Call Queue</CardTitle>
                    <CardDescription>Click on a call to review and rate it</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading calls...</div>
                    ) : calls.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No calls found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Recording</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calls.map((call) => (
                                    <TableRow key={call.call_id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getCallIcon(call.call_type, call.call_direction)}
                                                <span className="text-sm">{call.call_direction}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{call.contact_name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{call.contact_type}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{call.phone_number}</TableCell>
                                        <TableCell>{formatDuration(call.call_duration)}</TableCell>
                                        <TableCell className="text-sm">{formatDate(call.call_date)}</TableCell>
                                        <TableCell className="text-sm">{call.agent_extension || '-'}</TableCell>
                                        <TableCell>
                                            {call.recording_url ? (
                                                <a 
                                                    href={call.recording_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Play className="h-3 w-3" />
                                                    Play
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Not added</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {call.qc_rating ? renderStars(call.qc_rating) : '-'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(call.qc_status)}</TableCell>
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleOpenReview(call)}
                                            >
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Review Modal */}
            <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Call</DialogTitle>
                        <DialogDescription>
                            Add recording link and rate the call quality
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedCall && (
                        <div className="space-y-6">
                            {/* Call Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Contact</Label>
                                    <p className="font-medium">{selectedCall.contact_name || 'Unknown'}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Phone</Label>
                                    <p className="font-mono">{selectedCall.phone_number}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Date & Time</Label>
                                    <p>{formatDate(selectedCall.call_date)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Duration</Label>
                                    <p>{formatDuration(selectedCall.call_duration)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Direction</Label>
                                    <p>{selectedCall.call_direction}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Agent</Label>
                                    <p>{selectedCall.agent_extension || '-'}</p>
                                </div>
                            </div>

                            {/* Quick Access to 3CX */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-blue-600">Find Recording in 3CX</p>
                                        <p className="text-sm text-muted-foreground">
                                            Search for recordings matching this call
                                        </p>
                                    </div>
                                    <a 
                                        href={selectedCall.threecx_recordings_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    >
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open 3CX Recordings
                                        </Button>
                                    </a>
                                </div>
                            </div>

                            {/* Recording URL */}
                            <div className="space-y-2">
                                <Label htmlFor="recording_url">Recording URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="recording_url"
                                        value={qcForm.recording_url}
                                        onChange={(e) => setQcForm({...qcForm, recording_url: e.target.value})}
                                        placeholder="Paste the recording URL from 3CX here..."
                                    />
                                    {qcForm.recording_url && (
                                        <a 
                                            href={qcForm.recording_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="outline" size="icon">
                                                <Play className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Copy the recording download link from 3CX and paste it here
                                </p>
                            </div>

                            {/* Rating */}
                            <div className="space-y-2">
                                <Label>Call Quality Rating</Label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Button
                                            key={star}
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setQcForm({...qcForm, qc_rating: star})}
                                            className="hover:bg-transparent"
                                        >
                                            <Star
                                                className={`h-8 w-8 transition-colors ${
                                                    star <= qcForm.qc_rating 
                                                        ? 'text-yellow-500 fill-yellow-500' 
                                                        : 'text-gray-300 hover:text-yellow-300'
                                                }`}
                                            />
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>QC Status</Label>
                                <Select 
                                    value={qcForm.qc_status} 
                                    onValueChange={(value) => setQcForm({...qcForm, qc_status: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="reviewed">Reviewed</SelectItem>
                                        <SelectItem value="flagged">Flagged for Review</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="qc_notes">QC Notes</Label>
                                <Textarea
                                    id="qc_notes"
                                    value={qcForm.qc_notes}
                                    onChange={(e) => setQcForm({...qcForm, qc_notes: e.target.value})}
                                    placeholder="Add notes about this call..."
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowReviewModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitReview}>
                                    Save Review
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QCDashboardPage;
