import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight,
  Sparkles, Loader2, Settings, Instagram, Twitter, Facebook, Youtube,
  Globe, Edit, Check, Video, Film, Image, FileCheck, Send, Copy,
  AlertTriangle, BarChart3, Lightbulb,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'x', label: 'X / Twitter', icon: Twitter },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'tiktok', label: 'TikTok', icon: Globe },
  { id: 'linkedin', label: 'LinkedIn', icon: Globe },
];

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'alternate_day', label: 'Alternate Day' },
  { id: 'twice_a_week', label: 'Twice a Week' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Biweekly' },
];

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: 'bg-slate-400', icon: CalendarIcon },
  video_shot: { label: 'Video Shot', color: 'bg-amber-500', icon: Video },
  edited: { label: 'Edited', color: 'bg-blue-500', icon: Film },
  approved: { label: 'Approved', color: 'bg-emerald-500', icon: FileCheck },
  posted: { label: 'Posted', color: 'bg-violet-500', icon: Send },
};

const STATUSES = Object.keys(STATUS_CONFIG);

export default function MarketingCalendarPage() {
  const [pages, setPages] = useState([]);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddPage, setShowAddPage] = useState(false);
  const [showEntry, setShowEntry] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [pageForm, setPageForm] = useState({
    name: '', platform: 'instagram', url: '', handle: '',
    posting_frequency: 'alternate_day', description: '',
  });

  const fetchPages = useCallback(async () => {
    try {
      const res = await apiClient.get('/marketing/calendar/pages');
      setPages(res.data.pages || []);
    } catch { /* ignore */ }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await apiClient.get(`/marketing/calendar/entries?month=${currentMonth}`);
      setEntries(res.data.entries || []);
    } catch { /* ignore */ }
  }, [currentMonth]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/marketing/calendar/stats');
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchPages(), fetchEntries(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchPages, fetchEntries, fetchStats]);

  useEffect(() => { fetchEntries(); }, [currentMonth, fetchEntries]);

  const addPage = async () => {
    if (!pageForm.name.trim()) return toast.error('Page name required');
    try {
      await apiClient.post('/marketing/calendar/pages', pageForm);
      toast.success(`${pageForm.name} added!`);
      setPageForm({ name: '', platform: 'instagram', url: '', handle: '', posting_frequency: 'alternate_day', description: '' });
      setShowAddPage(false);
      fetchPages();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const deletePage = async (id, name) => {
    if (!window.confirm(`Delete ${name} and all its calendar entries?`)) return;
    try {
      await apiClient.delete(`/marketing/calendar/pages/${id}`);
      toast.success(`${name} removed`);
      fetchPages();
      fetchEntries();
    } catch { toast.error('Delete failed'); }
  };

  const generateCalendar = async () => {
    if (pages.length === 0) return toast.error('Add pages first before generating calendar');
    setGenerating(true);
    try {
      const res = await apiClient.post('/marketing/calendar/generate', { days_ahead: 30 });
      toast.success(res.data.message);
      fetchEntries();
      fetchStats();
    } catch { toast.error('Failed to generate calendar'); }
    finally { setGenerating(false); }
  };

  const updateEntry = async (entryId, updates) => {
    try {
      await apiClient.put(`/marketing/calendar/entries/${entryId}`, updates);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updates } : e));
      if (showEntry?.id === entryId) setShowEntry(prev => ({ ...prev, ...updates }));
      toast.success('Updated');
      fetchStats();
    } catch { toast.error('Update failed'); }
  };

  const suggestContent = async (entryId) => {
    setSuggesting(true);
    try {
      const res = await apiClient.post(`/marketing/calendar/entries/${entryId}/suggest`);
      const suggestion = res.data.suggestion;
      setShowEntry(prev => prev ? { ...prev, ai_suggestion: suggestion } : prev);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ai_suggestion: suggestion } : e));
      toast.success('AI suggestion generated!');
    } catch { toast.error('Suggestion failed'); }
    finally { setSuggesting(false); }
  };

  // Calendar grid
  const monthDate = new Date(currentMonth + '-01');
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date().toISOString().slice(0, 10);

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const entriesByDate = {};
  entries.forEach(e => {
    if (!entriesByDate[e.date]) entriesByDate[e.date] = [];
    entriesByDate[e.date].push(e);
  });

  const monthName = monthDate.toLocaleString('en', { month: 'long', year: 'numeric' });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-[1400px] mx-auto" data-testid="marketing-calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-pink-500" />
            Marketing Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Plan, track, and never miss a post across all your pages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddPage(true)} data-testid="add-page-btn">
            <Plus className="h-3 w-3 mr-1" /> Add Page
          </Button>
          <Button size="sm" onClick={generateCalendar} disabled={generating} data-testid="gen-calendar-btn">
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CalendarIcon className="h-3 w-3 mr-1" />}
            {generating ? 'Generating...' : 'Generate Calendar'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* ═══ CALENDAR VIEW ═══ */}
        <TabsContent value="calendar" className="space-y-3">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-base font-semibold">{monthName}</h2>
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* Page Legend */}
          {pages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pages.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-muted/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="p-1.5 text-[10px] font-semibold text-center text-muted-foreground border-b">{d}</div>
              ))}
            </div>
            {/* Day Cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] border-b border-r bg-muted/10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
                const dayEntries = entriesByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isPast = dateStr < today;

                return (
                  <div key={day}
                    className={`min-h-[90px] border-b border-r p-1 relative transition-colors ${isToday ? 'bg-pink-500/5 ring-1 ring-inset ring-pink-500/30' : isPast ? 'bg-muted/5' : 'hover:bg-muted/10'}`}>
                    <div className={`text-[10px] font-medium mb-0.5 ${isToday ? 'text-pink-600 font-bold' : isPast ? 'text-muted-foreground/50' : ''}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-[70px]">
                      {dayEntries.map(entry => {
                        const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.planned;
                        return (
                          <div key={entry.id}
                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: `${entry.page_color}15`, borderLeft: `3px solid ${entry.page_color}` }}
                            onClick={() => setShowEntry(entry)}
                            data-testid={`cal-entry-${entry.id}`}>
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.color}`} />
                            <span className="truncate" style={{ color: entry.page_color }}>
                              {entry.title || entry.page_name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            {STATUSES.map(s => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].color}`} />
                {STATUS_CONFIG[s].label}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ═══ PAGES TAB ═══ */}
        <TabsContent value="pages" className="space-y-3">
          <p className="text-xs text-muted-foreground">Manage all your social media pages. Set posting frequency per page — the calendar auto-generates based on these rules.</p>
          {pages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Instagram className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pages added yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowAddPage(true)}>Add Your First Page</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pages.map(p => {
                const PlatformIcon = PLATFORMS.find(pl => pl.id === p.platform)?.icon || Globe;
                return (
                  <Card key={p.id} className="hover:border-pink-500/30 transition-colors" data-testid={`page-card-${p.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                          <div>
                            <h3 className="text-sm font-semibold flex items-center gap-1.5">
                              <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {p.name}
                            </h3>
                            {p.handle && <p className="text-[10px] text-muted-foreground">{p.handle}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-500"
                          onClick={() => deletePage(p.id, p.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block truncate">{p.url}</a>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{p.platform}</Badge>
                        <Badge variant="outline" className="text-[9px]">{FREQUENCIES.find(f => f.id === p.posting_frequency)?.label || p.posting_frequency}</Badge>
                      </div>
                      {p.description && <p className="text-[10px] text-muted-foreground mt-1.5">{p.description}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ PIPELINE TAB ═══ */}
        <TabsContent value="pipeline" className="space-y-3">
          <p className="text-xs text-muted-foreground">Track content readiness across all pages for {monthName}.</p>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-5 gap-2">
              {STATUSES.map(s => (
                <Card key={s}>
                  <CardContent className="p-3 text-center">
                    <div className={`w-6 h-6 rounded-full ${STATUS_CONFIG[s].color} mx-auto flex items-center justify-center mb-1`}>
                      {React.createElement(STATUS_CONFIG[s].icon, { className: 'h-3 w-3 text-white' })}
                    </div>
                    <p className="text-lg font-bold">{stats.by_status?.[s] || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{STATUS_CONFIG[s].label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Per-Page Pipeline */}
          {stats?.page_stats?.map(ps => (
            <div key={ps.name} className="flex items-center gap-3 p-2 border rounded-lg">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ps.color }} />
              <span className="text-xs font-medium min-w-[140px]">{ps.name}</span>
              <div className="flex-1 flex items-center gap-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${ps.posted + ps.pending > 0 ? (ps.posted / (ps.posted + ps.pending)) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground min-w-[60px] text-right">{ps.posted} / {ps.posted + ps.pending}</span>
              </div>
            </div>
          ))}

          {/* Pipeline Board */}
          <div className="grid grid-cols-5 gap-2">
            {STATUSES.map(status => {
              const cfg = STATUS_CONFIG[status];
              const statusEntries = entries.filter(e => e.status === status);
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                    <span className="text-[10px] font-semibold">{cfg.label} ({statusEntries.length})</span>
                  </div>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {statusEntries.slice(0, 20).map(entry => (
                      <div key={entry.id}
                        className="p-1.5 rounded border text-[10px] cursor-pointer hover:bg-muted/20"
                        style={{ borderLeftColor: entry.page_color, borderLeftWidth: '3px' }}
                        onClick={() => setShowEntry(entry)}>
                        <p className="font-medium truncate">{entry.title || entry.page_name}</p>
                        <p className="text-muted-foreground">{entry.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ ADD PAGE DIALOG ═══ */}
      <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
        <DialogContent className="max-w-md" data-testid="add-page-dialog">
          <DialogHeader><DialogTitle>Add Social Media Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Page Name *</Label>
                <Input value={pageForm.name} onChange={e => setPageForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. CLT Academy Main" data-testid="page-name-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Platform</Label>
                <Select value={pageForm.platform} onValueChange={v => setPageForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>
                        <span className="flex items-center gap-1.5"><pl.icon className="h-3 w-3" />{pl.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Handle</Label>
                <Input value={pageForm.handle} onChange={e => setPageForm(p => ({ ...p, handle: e.target.value }))}
                  placeholder="@clt_academy" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Posting Frequency</Label>
                <Select value={pageForm.posting_frequency} onValueChange={v => setPageForm(p => ({ ...p, posting_frequency: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Page URL</Label>
              <Input value={pageForm.url} onChange={e => setPageForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://instagram.com/clt_academy" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description / Theme</Label>
              <Textarea value={pageForm.description} onChange={e => setPageForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Main CLT page — course promos, student testimonials, market insights" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPage(false)}>Cancel</Button>
            <Button onClick={addPage} data-testid="save-page-btn">Add Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ ENTRY DETAIL DIALOG ═══ */}
      <Dialog open={!!showEntry} onOpenChange={() => setShowEntry(null)}>
        <DialogContent className="max-w-lg" data-testid="entry-detail-dialog">
          {showEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: showEntry.page_color }} />
                  {showEntry.page_name} — {showEntry.date}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* Status Pipeline */}
                <div className="flex items-center gap-1">
                  {STATUSES.map((s, i) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = s === showEntry.status;
                    const isPast = STATUSES.indexOf(showEntry.status) > i;
                    return (
                      <React.Fragment key={s}>
                        <button
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${isActive ? `${cfg.color} text-white` : isPast ? 'bg-muted text-muted-foreground line-through' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                          onClick={() => updateEntry(showEntry.id, { status: s })}
                          data-testid={`status-btn-${s}`}>
                          {React.createElement(cfg.icon, { className: 'h-2.5 w-2.5' })}
                          {cfg.label}
                        </button>
                        {i < STATUSES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <Label className="text-xs">Post Title</Label>
                  <Input value={showEntry.title || ''} onChange={e => setShowEntry(prev => ({ ...prev, title: e.target.value }))}
                    onBlur={() => updateEntry(showEntry.id, { title: showEntry.title })}
                    placeholder="Give this post a title..." />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs">Description / Notes</Label>
                  <Textarea value={showEntry.description || ''} onChange={e => setShowEntry(prev => ({ ...prev, description: e.target.value }))}
                    onBlur={() => updateEntry(showEntry.id, { description: showEntry.description })}
                    placeholder="What should this post be about?" rows={2} />
                </div>

                {/* Content Type */}
                <div className="space-y-1">
                  <Label className="text-xs">Content Type</Label>
                  <Select value={showEntry.content_type || 'post'} onValueChange={v => updateEntry(showEntry.id, { content_type: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Static Post</SelectItem>
                      <SelectItem value="reel">Reel / Short Video</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="video">Long Video</SelectItem>
                      <SelectItem value="live">Live Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Suggestion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3 text-pink-500" /> AI Content Suggestion</Label>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => suggestContent(showEntry.id)} disabled={suggesting}>
                      {suggesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Lightbulb className="h-3 w-3 mr-1" />}
                      {suggesting ? 'Thinking...' : 'Get Suggestion'}
                    </Button>
                  </div>
                  {showEntry.ai_suggestion && typeof showEntry.ai_suggestion === 'object' && !showEntry.ai_suggestion.error && (
                    <div className="p-3 bg-pink-500/5 border border-pink-500/20 rounded-lg space-y-2 text-xs">
                      {showEntry.ai_suggestion.title && (
                        <div>
                          <span className="font-semibold text-pink-600">Title: </span>
                          <span>{showEntry.ai_suggestion.title}</span>
                        </div>
                      )}
                      {showEntry.ai_suggestion.hook && (
                        <div>
                          <span className="font-semibold text-pink-600">Hook: </span>
                          <span className="italic">{showEntry.ai_suggestion.hook}</span>
                        </div>
                      )}
                      {showEntry.ai_suggestion.content_idea && (
                        <div>
                          <span className="font-semibold text-pink-600">Content Idea: </span>
                          <span className="text-muted-foreground">{showEntry.ai_suggestion.content_idea}</span>
                        </div>
                      )}
                      {showEntry.ai_suggestion.caption && (
                        <div className="p-2 bg-muted/30 rounded border">
                          <p className="font-semibold text-[10px] text-pink-600 mb-1">Caption:</p>
                          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{showEntry.ai_suggestion.caption}</p>
                          <Button variant="ghost" size="sm" className="h-5 text-[9px] mt-1 p-0"
                            onClick={() => { navigator.clipboard.writeText(showEntry.ai_suggestion.caption); toast.success('Copied!'); }}>
                            <Copy className="h-2.5 w-2.5 mr-1" /> Copy Caption
                          </Button>
                        </div>
                      )}
                      {showEntry.ai_suggestion.cta && (
                        <div><span className="font-semibold text-pink-600">CTA: </span><span>{showEntry.ai_suggestion.cta}</span></div>
                      )}
                      {showEntry.ai_suggestion.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {showEntry.ai_suggestion.hashtags.map((h, i) => (
                            <Badge key={i} variant="outline" className="text-[9px]">#{h.replace('#', '')}</Badge>
                          ))}
                        </div>
                      )}
                      {showEntry.ai_suggestion.why_this_works && (
                        <p className="text-[10px] text-muted-foreground/70 italic">{showEntry.ai_suggestion.why_this_works}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
