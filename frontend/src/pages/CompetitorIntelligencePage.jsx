import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Globe, Plus, Trash2, RefreshCw, Eye, Search, Shield, Zap,
  Instagram, Facebook, Linkedin, Youtube, Twitter, Star,
  TrendingUp, Users, DollarSign, Target, Loader2, ExternalLink,
} from 'lucide-react';

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/...' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@...' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, placeholder: 'https://x.com/...' },
  { key: 'google_reviews', label: 'Google Reviews / GMB', icon: Star, placeholder: 'https://maps.google.com/...' },
  { key: 'fb_ad_library', label: 'FB Ad Library', icon: Search, placeholder: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&...' },
  { key: 'tiktok', label: 'TikTok', icon: Globe, placeholder: 'https://tiktok.com/@...' },
];

export default function CompetitorIntelligencePage() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedComp, setSelectedComp] = useState(null);
  const [intel, setIntel] = useState(null);
  const [battleCard, setBattleCard] = useState(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [scraping, setScraping] = useState({});
  const [scrapingAll, setScrapingAll] = useState(false);

  const [form, setForm] = useState({
    name: '', website: '', notes: '',
    instagram: '', facebook: '', linkedin: '', youtube: '', twitter: '', google_reviews: '',
    fb_ad_library: '', tiktok: '',
  });

  const fetchCompetitors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/intelligence/competitors');
      setCompetitors(res.data.competitors || []);
    } catch { toast.error('Failed to load competitors'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try {
      await apiClient.post('/intelligence/competitors', form);
      toast.success(`${form.name} added!`);
      setForm({ name: '', website: '', notes: '', instagram: '', facebook: '', linkedin: '', youtube: '', twitter: '', google_reviews: '', fb_ad_library: '', tiktok: '' });
      setShowAdd(false);
      fetchCompetitors();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await apiClient.delete(`/intelligence/competitors/${id}`);
      toast.success(`${name} removed`);
      fetchCompetitors();
      if (selectedComp?.id === id) { setSelectedComp(null); setIntel(null); }
    } catch { toast.error('Delete failed'); }
  };

  const handleScrape = async (id, name) => {
    setScraping(p => ({ ...p, [id]: true }));
    try {
      const res = await apiClient.post(`/intelligence/competitors/${id}/scrape`);
      toast.success(res.data.message);
      fetchCompetitors();
      if (selectedComp?.id === id) viewIntel(id);
    } catch (e) { toast.error(e.response?.data?.detail || 'Scrape failed'); }
    finally { setScraping(p => ({ ...p, [id]: false })); }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    try {
      const res = await apiClient.post('/intelligence/competitors/scrape-all');
      toast.success(res.data.message);
      fetchCompetitors();
    } catch { toast.error('Batch scrape failed'); }
    finally { setScrapingAll(false); }
  };

  const viewIntel = async (id) => {
    const comp = competitors.find(c => c.id === id);
    setSelectedComp(comp);
    setBattleCard(null);
    try {
      const [intelRes, cardRes] = await Promise.all([
        apiClient.get(`/intelligence/competitors/${id}/intel`),
        apiClient.get(`/intelligence/competitors/${id}/battle-card`).catch(() => ({ data: { battle_card: null } })),
      ]);
      setIntel(intelRes.data);
      setBattleCard(cardRes.data?.battle_card || null);
    } catch { toast.error('Failed to load intel'); }
  };

  const generateBattleCard = async (id) => {
    setGeneratingCard(true);
    try {
      const res = await apiClient.post(`/intelligence/competitors/${id}/battle-card`);
      setBattleCard(res.data?.battle_card || null);
      toast.success('Battle Card generated!');
    } catch { toast.error('Failed to generate battle card'); }
    finally { setGeneratingCard(false); }
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="competitor-intel-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" />
            Competitor Intelligence Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track, analyze, and outperform your competition</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleScrapeAll} disabled={scrapingAll} data-testid="scrape-all-btn">
            {scrapingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {scrapingAll ? 'Scraping...' : 'Scrape All'}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="add-competitor-btn">
            <Plus className="h-3 w-3 mr-1" /> Add Competitor
          </Button>
        </div>
      </div>

      {/* Competitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {competitors.map(comp => (
          <Card key={comp.id} className={`cursor-pointer transition-all hover:border-violet-500/50 ${selectedComp?.id === comp.id ? 'border-violet-500 ring-1 ring-violet-500/30' : ''}`}
            onClick={() => viewIntel(comp.id)} data-testid={`competitor-card-${comp.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{comp.name}</h3>
                  {comp.website && (
                    <a href={comp.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                      onClick={e => e.stopPropagation()}>
                      <Globe className="h-3 w-3" />{comp.website.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={e => { e.stopPropagation(); handleScrape(comp.id, comp.name); }}
                    disabled={scraping[comp.id]} data-testid={`scrape-btn-${comp.id}`}>
                    {scraping[comp.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                    onClick={e => { e.stopPropagation(); handleDelete(comp.id, comp.name); }}
                    data-testid={`delete-btn-${comp.id}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {/* Social icons */}
              <div className="flex items-center gap-2 mt-2">
                {Object.entries(comp.social_links || {}).filter(([, v]) => v).map(([key]) => {
                  const sf = SOCIAL_FIELDS.find(f => f.key === key);
                  return sf ? <sf.icon key={key} className="h-3.5 w-3.5 text-muted-foreground" /> : null;
                })}
              </div>
              {/* Last scraped */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {comp.last_scraped ? `Scraped ${new Date(comp.last_scraped).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Not yet scraped'}
                </span>
                <Badge variant="outline" className={`text-[9px] ${comp.status === 'active' ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-500'}`}>
                  {comp.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && competitors.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No competitors tracked yet</p>
            <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>Add Your First Competitor</Button>
          </div>
        )}
      </div>

      {/* Intel Detail Panel */}
      {selectedComp && intel && (
        <Card className="border-violet-500/30" data-testid="intel-detail-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-violet-500" />
                Intel: {selectedComp.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedComp(null); setIntel(null); }}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="battlecard" className="text-xs">Battle Card</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
                <TabsTrigger value="courses" className="text-xs">Courses</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">Raw Content</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-3">
                <div className="space-y-3">
                  {intel.intel?.map((item, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">{item.source_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(item.scraped_at).toLocaleString()}</span>
                      </div>
                      {item.title && <p className="text-sm font-medium">{item.title}</p>}
                      {item.meta_description && <p className="text-xs text-muted-foreground mt-1">{item.meta_description}</p>}
                      {item.error && <p className="text-xs text-red-500 mt-1">Error: {item.error}</p>}
                    </div>
                  ))}
                  {(!intel.intel || intel.intel.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No intel yet. Click scrape to gather data.</p>
                  )}
                </div>
              </TabsContent>

              {/* Battle Card Tab */}
              <TabsContent value="battlecard" className="mt-3" data-testid="tab-battlecard">
                {battleCard ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                      <h4 className="text-sm font-semibold mb-1">Overview</h4>
                      <p className="text-xs text-muted-foreground">{battleCard.overview}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-red-600 mb-1">Their Strengths</h4>
                        <ul className="space-y-1">
                          {(battleCard.strengths || []).map((s, i) => <li key={i} className="text-[11px] text-muted-foreground">{s}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-amber-600 mb-1">Their Weaknesses</h4>
                        <ul className="space-y-1">
                          {(battleCard.weaknesses || []).map((s, i) => <li key={i} className="text-[11px] text-muted-foreground">{s}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <h4 className="text-xs font-semibold text-emerald-600 mb-1">Our Advantages</h4>
                      <ul className="space-y-1">
                        {(battleCard.our_advantages || []).map((s, i) => <li key={i} className="text-[11px] text-muted-foreground flex gap-1"><span className="text-emerald-500 flex-shrink-0">+</span>{s}</li>)}
                      </ul>
                    </div>
                    {battleCard.objection_counters?.length > 0 && (
                      <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-blue-600 mb-2">Objection Counters</h4>
                        <div className="space-y-2">
                          {battleCard.objection_counters.map((oc, i) => (
                            <div key={i} className="text-[11px]">
                              <p className="text-red-500 font-medium">"{oc.objection}"</p>
                              <p className="text-muted-foreground ml-2 mt-0.5">{oc.counter}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {battleCard.key_talking_points?.length > 0 && (
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <h4 className="text-xs font-semibold mb-1">Key Talking Points for Sales Calls</h4>
                        <ul className="space-y-1">
                          {battleCard.key_talking_points.map((tp, i) => <li key={i} className="text-[11px] text-muted-foreground flex gap-1"><span className="text-indigo-500 flex-shrink-0">-</span>{tp}</li>)}
                        </ul>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => generateBattleCard(selectedComp.id)} disabled={generatingCard}>
                      {generatingCard ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Regenerate
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-3">No battle card yet. Generate one from scraped data.</p>
                    <Button size="sm" onClick={() => generateBattleCard(selectedComp.id)} disabled={generatingCard} data-testid="gen-battlecard-btn">
                      {generatingCard ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                      {generatingCard ? 'Generating...' : 'Generate Battle Card'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pricing" className="mt-3">
                <ScrollArea className="max-h-[300px]">
                  {intel.intel?.filter(i => i.pricing).map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border mb-2">
                      <Badge variant="outline" className="text-[10px] mb-2">{item.source_type}</Badge>
                      <pre className="text-xs whitespace-pre-wrap">{item.pricing || 'No pricing data found'}</pre>
                    </div>
                  ))}
                  {!intel.intel?.some(i => i.pricing) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No pricing data scraped yet</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="courses" className="mt-3">
                <ScrollArea className="max-h-[300px]">
                  {intel.intel?.filter(i => i.courses).map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border mb-2">
                      <Badge variant="outline" className="text-[10px] mb-2">{item.source_type}</Badge>
                      <pre className="text-xs whitespace-pre-wrap">{item.courses || 'No course data found'}</pre>
                    </div>
                  ))}
                  {!intel.intel?.some(i => i.courses) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No course data scraped yet</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="raw" className="mt-3">
                <ScrollArea className="max-h-[400px]">
                  {intel.intel?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px]">{item.source_type}</Badge>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />Open
                          </a>
                        )}
                      </div>
                      <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-[200px] overflow-y-auto">{item.content?.slice(0, 2000) || 'No content'}</pre>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Add Competitor Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg" data-testid="add-competitor-dialog">
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Delta Trading Academy" data-testid="comp-name-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://..." data-testid="comp-website-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Social Links</Label>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_FIELDS.map(sf => (
                  <div key={sf.key} className="flex items-center gap-2">
                    <sf.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <Input value={form[sf.key]} onChange={e => setForm(p => ({ ...p, [sf.key]: e.target.value }))}
                      placeholder={sf.placeholder} className="h-8 text-xs" data-testid={`comp-${sf.key}-input`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Key differentiators, pricing notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} data-testid="save-competitor-btn">Add Competitor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
