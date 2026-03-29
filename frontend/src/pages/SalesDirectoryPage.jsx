import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/Pagination';
import { Search, Download, Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

const MONTHS = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const PAYMENT_METHODS = {
    tabby: 'Tabby', cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer',
    cheque: 'Cheque', online: 'Online', bnpl: 'BNPL', tamara: 'Tamara',
};

const SalesDirectoryPage = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
    const [agentFilter, setAgentFilter] = useState('all');
    const [agents, setAgents] = useState([]);
    const [summary, setSummary] = useState({ total: 0, revenue: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                page_size: pageSize,
                stage: 'enrolled',
                sort_by: 'enrolled_at',
                sort_order: 'desc',
            });
            if (searchTerm) params.append('search', searchTerm);
            if (agentFilter !== 'all') params.append('assigned_to', agentFilter);
            if (monthFilter !== 'all') {
                const y = yearFilter;
                const m = monthFilter;
                const lastDay = new Date(y, parseInt(m), 0).getDate();
                params.append('date_from', `${y}-${m}-01`);
                params.append('date_to', `${y}-${m}-${lastDay}`);
                params.append('date_field', 'enrolled_at');
            }

            const res = await apiClient.get(`/leads?${params.toString()}`);
            const data = res.data;
            const items = data?.items || (Array.isArray(data) ? data : []);
            setLeads(items);
            setTotalRecords(data?.total || items.length);
            setTotalPages(data?.total_pages || 1);

            // Calculate summary
            let rev = 0;
            items.forEach(l => { rev += (l.sale_amount || l.enrollment_amount || 0); });
            setSummary({ total: data?.total || items.length, revenue: rev });

            // Extract unique agents
            const agentMap = {};
            items.forEach(l => {
                if (l.assigned_to && l.assigned_to_name) {
                    agentMap[l.assigned_to] = l.assigned_to_name;
                }
            });
            if (Object.keys(agentMap).length > 0) {
                setAgents(prev => {
                    const merged = { ...Object.fromEntries(prev.map(a => [a.id, a.name])), ...agentMap };
                    return Object.entries(merged).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
                });
            }
        } catch (err) {
            console.error('Failed to fetch sales directory', err);
        }
        setLoading(false);
    }, [currentPage, pageSize, searchTerm, monthFilter, yearFilter, agentFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Also fetch all agents once
    useEffect(() => {
        apiClient.get('/users?role=sales_executive,team_leader').then(res => {
            const users = res.data?.users || res.data || [];
            if (Array.isArray(users) && users.length > 0) {
                setAgents(users.map(u => ({ id: u.id, name: u.full_name })).sort((a, b) => a.name.localeCompare(b.name)));
            }
        }).catch(() => {});
    }, []);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

    return (
        <div className="space-y-5 p-1" data-testid="sales-directory-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sales Directory</h1>
                    <p className="text-sm text-muted-foreground">Enrolled students — verified closings by the sales team</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Enrolled</p>
                            <p className="text-xl font-bold">{totalRecords.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Page Revenue</p>
                            <p className="text-xl font-bold">AED {summary.revenue.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Period</p>
                            <p className="text-lg font-bold">{monthFilter === 'all' ? 'All Time' : `${MONTHS.find(m => m.value === monthFilter)?.label || ''} ${yearFilter}`}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                            <p className="text-xl font-bold">AED {leads.length > 0 ? Math.round(summary.revenue / leads.length).toLocaleString() : 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by name, email, phone..."
                        className="pl-9 h-9 text-sm"
                        data-testid="sales-dir-search"
                    />
                </div>

                <Select value={monthFilter} onValueChange={v => { setMonthFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[140px] h-9 text-xs" data-testid="sales-dir-month">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={yearFilter} onValueChange={v => { setYearFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[100px] h-9 text-xs" data-testid="sales-dir-year">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="sales-dir-agent">
                        <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {agents.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden" data-testid="sales-dir-table">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-12">Sr</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Paid By</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Agent</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Enrolled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {leads.map((lead, idx) => (
                                <tr key={lead.id} className="hover:bg-muted/30 transition-colors" data-testid={`sales-dir-row-${idx}`}>
                                    <td className="px-4 py-2.5 text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                                    <td className="px-4 py-2.5 font-medium">{lead.full_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{lead.email || '—'}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{lead.phone || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs">{lead.interested_course_name || lead.course_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">AED {(lead.sale_amount || lead.enrollment_amount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-2.5">
                                        <Badge variant="outline" className="text-[10px] capitalize">
                                            {PAYMENT_METHODS[lead.payment_method] || lead.payment_method || '—'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs">{lead.assigned_to_name || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                        {lead.enrolled_at ? new Date(lead.enrolled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {leads.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>No enrolled students found for this period</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {!loading && leads.length > 0 && (
                <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    total={totalRecords}
                    pageSize={pageSize}
                    onPageChange={p => setCurrentPage(p)}
                    onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
                />
            )}
        </div>
    );
};

export default SalesDirectoryPage;
