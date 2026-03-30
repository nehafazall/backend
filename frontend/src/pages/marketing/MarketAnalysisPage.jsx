import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  TrendingUp, Star, ThumbsUp, ThumbsDown, Minus, Loader2,
  RefreshCw, BarChart3, Shield, MessageCircle, Zap, AlertTriangle,
  Search, Eye, Target, Megaphone, Copy, ExternalLink, Sparkles, Globe,
} from 'lucide-react';

const SCORE_COLOR = (score) => {
  if (score >= 8) return 'text-emerald-500';
  if (score >= 6) return 'text-blue-500';
  if (score >= 4) return 'text-amber-500';
  return 'text-red-500';
};

const SCORE_BG = (score) => {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-blue-500';
  if (score >= 4) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function MarketAnalysisPage() {
  const [competitors, setCompetitors] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState({});
  const [adsData, setAdsData] = useState({});
  const [socialData, setSocialData] = useState({});
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState({});
  // Ad Intelligence state
  const [adSearchTerm, setAdSearchTerm] = useState('');
  const [adSearchCountry, setAdSearchCountry] = useState('AE');
  const [adSearchResults, setAdSearchResults] = useState(null);
  const [adSearching, setAdSearching] = useState(false);
  const [adAnalysis, setAdAnalysis] = useState(null);
  const [adAnalyzing, setAdAnalyzing] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newToken, setNewToken] = useState('');

  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await apiClient.get('/intelligence/competitors');
      setCompetitors(res.data.competitors || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchMatrix = useCallback(async () => {
    try {
      const res = await apiClient.get('/intelligence/comparative-matrix');
      setMatrix(res.data.matrix || res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompetitors(); fetchMatrix(); }, [fetchCompetitors, fetchMatrix]);

  // Load ad intelligence data on mount
  useEffect(() => {
    apiClient.get('/intelligence/ad-library/searches').then(r => setSavedSearches(r.data?.searches || [])).catch(() => {});
    apiClient.get('/settings/meta-ad-token-status').then(r => setTokenConfigured(r.data?.configured || false)).catch(() => {});
  }, []);

  const handleAdSearch = async () => {
    if (!adSearchTerm.trim()) return;
    setAdSearching(true);
    setAdAnalysis(null);
    try {
      const res = await apiClient.post('/intelligence/ad-library/search', {
        search_terms: adSearchTerm, country: adSearchCountry, limit: 30,
      });
      setAdSearchResults(res.data);
      setSavedSearches(prev => {
        const exists = prev.find(s => s.search_terms?.toLowerCase() === adSearchTerm.toLowerCase());
        if (exists) return prev;
        return [{ search_terms: adSearchTerm, ads_count: res.data?.ads_count || 0, source: res.data?.source, searched_at: new Date().toISOString() }, ...prev];
      });
      toast.success(`Found ${res.data?.ads_count || 0} ads (${res.data?.source === 'meta_api' ? 'Meta API' : 'Web Scrape'})`);
    } catch { toast.error('Ad search failed'); }
    finally { setAdSearching(false); }
  };

  const handleAdAnalyze = async () => {
    if (!adSearchTerm.trim()) return;
    setAdAnalyzing(true);
    try {
      const res = await apiClient.post('/intelligence/ad-library/analyze', { search_terms: adSearchTerm });
      setAdAnalysis(res.data?.analysis || res.data);
      toast.success('AI analysis complete');
    } catch { toast.error('Analysis failed'); }
    finally { setAdAnalyzing(false); }
  };

  const loadSavedSearch = async (terms) => {
    setAdSearchTerm(terms);
    setAdSearching(true);
    try {
      const [searchRes, analysisRes] = await Promise.all([
        apiClient.post('/intelligence/ad-library/search', { search_terms: terms, country: adSearchCountry }),
        apiClient.get(`/intelligence/ad-library/analysis?search_terms=${encodeURIComponent(terms)}`),
      ]);
      setAdSearchResults(searchRes.data);
      if (analysisRes.data?.analysis) setAdAnalysis(analysisRes.data.analysis);
    } catch { toast.error('Failed to load saved search'); }
    finally { setAdSearching(false); }
  };

  const saveMetaToken = async () => {
    if (!newToken.trim()) return;
    try {
      await apiClient.put('/settings/meta-ad-token', { token: newToken });
      setTokenConfigured(true);
      setShowTokenInput(false);
      setNewToken('');
      toast.success('Meta Ad Library token saved!');
    } catch { toast.error('Failed to save token'); }
  };

  const generateMatrix = async () => {
    setMatrixLoading(true);
    try {
      const res = await apiClient.post('/intelligence/comparative-matrix');
      setMatrix(res.data.matrix || res.data);
      toast.success('Scoring Matrix generated!');
    } catch { toast.error('Failed to generate matrix'); }
    finally { setMatrixLoading(false); }
  };

  const scrapeReviews = async (id, name) => {
    setScraping(p => ({ ...p, [`rev-${id}`]: true }));
    try {
      const res = await apiClient.post(`/intelligence/competitors/${id}/reviews`);
      setReviewsData(p => ({ ...p, [id]: res.data }));
      toast.success(`Reviews analyzed for ${name}`);
    } catch { toast.error('Review scrape failed'); }
    finally { setScraping(p => ({ ...p, [`rev-${id}`]: false })); }
  };

  const scrapeFbAds = async (id, name) => {
    setScraping(p => ({ ...p, [`ads-${id}`]: true }));
    try {
      const res = await apiClient.post(`/intelligence/competitors/${id}/fb-ads`);
      setAdsData(p => ({ ...p, [id]: res.data }));
      toast.success(`FB Ads analyzed for ${name}`);
    } catch { toast.error('Ad scrape failed'); }
    finally { setScraping(p => ({ ...p, [`ads-${id}`]: false })); }
  };

  const scrapeSocial = async (id, name) => {
    setScraping(p => ({ ...p, [`soc-${id}`]: true }));
    try {
      const res = await apiClient.post(`/intelligence/competitors/${id}/social-comments`);
      setSocialData(p => ({ ...p, [id]: res.data }));
      toast.success(`Social intel gathered for ${name}`);
    } catch { toast.error('Social scrape failed'); }
    finally { setScraping(p => ({ ...p, [`soc-${id}`]: false })); }
  };

  const loadCachedData = async (id) => {
    try {
      const [revRes, adRes, socRes] = await Promise.all([
        apiClient.get(`/intelligence/competitors/${id}/reviews`).catch(() => ({ data: null })),
        apiClient.get(`/intelligence/competitors/${id}/fb-ads`).catch(() => ({ data: null })),
        apiClient.get(`/intelligence/competitors/${id}/social-comments`).catch(() => ({ data: null })),
      ]);
      if (revRes.data) setReviewsData(p => ({ ...p, [id]: revRes.data }));
      if (adRes.data) setAdsData(p => ({ ...p, [id]: adRes.data }));
      if (socRes.data) setSocialData(p => ({ ...p, [id]: socRes.data }));
    } catch { /* ignore */ }
  };

  const matrixData = matrix?.matrix || matrix;
  const scores = matrixData?.scores || {};
  const dimensions = matrixData?.dimensions || [];
  const insights = matrixData?.insights || [];
  const companies = Object.keys(scores);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="market-analysis-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" />
            Market Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Comparative scoring, sentiment, and competitive positioning</p>
        </div>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix" data-testid="tab-matrix">Scoring Matrix</TabsTrigger>
          <TabsTrigger value="ad-intel" data-testid="tab-ad-intel">
            <Megaphone className="h-3 w-3 mr-1" />Ad Intelligence
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Review Sentiment</TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-ads">FB Ad Scraper</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social Intel</TabsTrigger>
        </TabsList>

        {/* ═══ SCORING MATRIX TAB ═══ */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-pink-500" />
                  Comparative Scoring Matrix
                </CardTitle>
                <Button size="sm" onClick={generateMatrix} disabled={matrixLoading} data-testid="gen-matrix-btn">
                  {matrixLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  {matrixLoading ? 'Generating...' : 'Generate Matrix'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {companies.length > 0 ? (
                <div className="space-y-4">
                  {/* Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold text-muted-foreground sticky left-0 bg-background">Dimension</th>
                          {companies.map(c => (
                            <th key={c} className={`p-2 text-center font-semibold min-w-[100px] ${c === 'CLT Academy' ? 'text-pink-600 bg-pink-50/50 dark:bg-pink-950/20' : ''}`}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dimensions.map(dim => (
                          <tr key={dim} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="p-2 font-medium text-muted-foreground sticky left-0 bg-background">{dim}</td>
                            {companies.map(c => {
                              const val = scores[c]?.[dim] || 0;
                              return (
                                <td key={c} className={`p-2 text-center ${c === 'CLT Academy' ? 'bg-pink-50/50 dark:bg-pink-950/20' : ''}`}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${SCORE_BG(val)}`}>
                                      {val}
                                    </div>
                                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${SCORE_BG(val)}`} style={{ width: `${val * 10}%` }} />
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* Average row */}
                        <tr className="border-t-2 font-semibold">
                          <td className="p-2 sticky left-0 bg-background">Overall Average</td>
                          {companies.map(c => {
                            const vals = dimensions.map(d => scores[c]?.[d] || 0);
                            const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
                            return (
                              <td key={c} className={`p-2 text-center ${c === 'CLT Academy' ? 'bg-pink-50/50 dark:bg-pink-950/20' : ''}`}>
                                <span className={`text-sm font-bold ${SCORE_COLOR(avg)}`}>{avg}</span>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Insights */}
                  {insights.length > 0 && (
                    <div className="p-3 bg-muted/30 rounded-lg border space-y-1.5">
                      <h4 className="text-xs font-semibold flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> AI Insights</h4>
                      {insights.map((ins, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{ins}</p>
                      ))}
                    </div>
                  )}

                  {/* CLT Strengths / Improvement */}
                  <div className="grid grid-cols-2 gap-3">
                    {matrixData?.clt_top_strengths?.length > 0 && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> CLT Top Strengths</h4>
                        <ul className="space-y-1">{matrixData.clt_top_strengths.map((s, i) => <li key={i} className="text-[11px] text-muted-foreground">+ {s}</li>)}</ul>
                      </div>
                    )}
                    {matrixData?.clt_improvement_areas?.length > 0 && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <h4 className="text-xs font-semibold text-amber-600 mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Areas to Improve</h4>
                        <ul className="space-y-1">{matrixData.clt_improvement_areas.map((s, i) => <li key={i} className="text-[11px] text-muted-foreground">{s}</li>)}</ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No scoring matrix yet.</p>
                  <p className="text-xs mt-1">Click "Generate Matrix" to compare CLT against all tracked competitors.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ AD INTELLIGENCE TAB ═══ */}
        <TabsContent value="ad-intel">
          <div className="space-y-4">
            {/* Token Status + Search Bar */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold">Facebook Ad Library Intelligence</span>
                    <Badge variant="outline" className={tokenConfigured ? 'text-emerald-600 border-emerald-500 text-[10px]' : 'text-amber-600 border-amber-500 text-[10px]'}>
                      {tokenConfigured ? 'API Connected' : 'Scrape Mode'}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setShowTokenInput(!showTokenInput)}>
                    {tokenConfigured ? 'Update Token' : 'Connect Meta API'}
                  </Button>
                </div>
                {showTokenInput && (
                  <div className="flex gap-2 p-2 bg-muted/30 rounded border">
                    <Input placeholder="Paste Meta Ad Library access token..." value={newToken} onChange={e => setNewToken(e.target.value)}
                      className="text-xs h-8 flex-1" data-testid="meta-token-input" type="password" />
                    <Button size="sm" className="h-8 text-xs" onClick={saveMetaToken} disabled={!newToken.trim()}>Save</Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowTokenInput(false)}>Cancel</Button>
                  </div>
                )}
                {!tokenConfigured && !showTokenInput && (
                  <p className="text-[10px] text-muted-foreground">Without a Meta API token, ads are fetched via web scraping (limited). Connect your token for full Ad Library access.</p>
                )}
                {/* Search */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search competitor ads (e.g., forex trading academy, trading course)..."
                      value={adSearchTerm} onChange={e => setAdSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-sm" data-testid="ad-search-input"
                      onKeyDown={e => e.key === 'Enter' && handleAdSearch()} />
                  </div>
                  <Select value={adSearchCountry} onValueChange={setAdSearchCountry}>
                    <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AE">UAE</SelectItem>
                      <SelectItem value="US">USA</SelectItem>
                      <SelectItem value="GB">UK</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="ALL">All</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8" onClick={handleAdSearch} disabled={adSearching || !adSearchTerm.trim()} data-testid="ad-search-btn">
                    {adSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                    Search Ads
                  </Button>
                </div>
                {/* Saved Searches */}
                {savedSearches.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Recent:</span>
                    {savedSearches.slice(0, 6).map((s, i) => (
                      <button key={i} onClick={() => loadSavedSearch(s.search_terms)}
                        className="px-2 py-0.5 text-[10px] rounded-full border hover:bg-muted transition-colors">
                        {s.search_terms} <span className="text-muted-foreground">({s.ads_count})</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Grid */}
            {adSearchResults && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Ad List */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{adSearchResults.ads_count || 0} Competitor Ads Found</h3>
                      <Badge variant="outline" className="text-[9px]">
                        {adSearchResults.source === 'meta_api' ? <><Globe className="h-2.5 w-2.5 mr-0.5" />Meta API</> : 'Web Scrape'}
                      </Badge>
                    </div>
                    <Button size="sm" className="h-7 text-[10px] gap-1" onClick={handleAdAnalyze} disabled={adAnalyzing || !adSearchResults.ads?.length} data-testid="analyze-ads-btn">
                      {adAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {adAnalyzing ? 'Analyzing...' : 'AI Analyze & Generate Counter-Ads'}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-2">
                      {(adSearchResults.ads || []).map((ad, i) => (
                        <Card key={i} className="overflow-hidden" data-testid={`ad-result-${i}`}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                                  {ad.page_name?.charAt(0) || '?'}
                                </div>
                                <span className="text-xs font-semibold">{ad.page_name || 'Unknown Page'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {ad.platforms?.map((p, j) => (
                                  <Badge key={j} variant="outline" className="text-[8px] capitalize">{p}</Badge>
                                ))}
                                {ad.start_date && <span className="text-[9px] text-muted-foreground">{ad.start_date.slice(0, 10)}</span>}
                              </div>
                            </div>
                            {ad.headline && (
                              <p className="text-xs font-semibold text-foreground">{ad.headline}</p>
                            )}
                            {ad.ad_text && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{ad.ad_text.slice(0, 400)}{ad.ad_text.length > 400 ? '...' : ''}</p>
                            )}
                            {ad.description && (
                              <p className="text-[10px] text-muted-foreground/70 italic">{ad.description.slice(0, 200)}</p>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-border/50">
                              <div className="flex items-center gap-2">
                                {ad.cta_caption && <Badge className="text-[9px] bg-blue-500">{ad.cta_caption}</Badge>}
                                {ad.audience_size?.lower_bound && (
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                    <Target className="h-2.5 w-2.5" />{Number(ad.audience_size.lower_bound).toLocaleString()}–{Number(ad.audience_size.upper_bound).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {ad.snapshot_url && (
                                  <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5"><Eye className="h-2.5 w-2.5 mr-0.5" />View</Button>
                                  </a>
                                )}
                                <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5"
                                  onClick={() => { navigator.clipboard.writeText(ad.ad_text || ''); toast.success('Ad text copied'); }}>
                                  <Copy className="h-2.5 w-2.5 mr-0.5" />Copy
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right: AI Analysis Panel */}
                <div className="space-y-3">
                  {adAnalysis && !adAnalysis.error ? (
                    <>
                      {/* Messaging Patterns */}
                      {adAnalysis.messaging_patterns?.length > 0 && (
                        <Card>
                          <CardContent className="p-3 space-y-2">
                            <h4 className="text-xs font-semibold flex items-center gap-1"><Target className="h-3 w-3 text-purple-500" /> Messaging Patterns</h4>
                            {adAnalysis.messaging_patterns.map((p, i) => (
                              <div key={i} className="p-2 bg-purple-500/5 rounded border border-purple-500/20">
                                <p className="text-[11px] font-medium">{p.pattern}</p>
                                <p className="text-[9px] text-muted-foreground">{p.frequency}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                      {/* Key Themes + CTAs */}
                      <Card>
                        <CardContent className="p-3 space-y-2">
                          <h4 className="text-xs font-semibold flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Themes & Triggers</h4>
                          {adAnalysis.key_themes?.length > 0 && (
                            <div><span className="text-[9px] text-muted-foreground">Themes:</span><div className="flex flex-wrap gap-1 mt-0.5">{adAnalysis.key_themes.map((t, i) => <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>)}</div></div>
                          )}
                          {adAnalysis.emotional_triggers?.length > 0 && (
                            <div><span className="text-[9px] text-muted-foreground">Emotional Triggers:</span><div className="flex flex-wrap gap-1 mt-0.5">{adAnalysis.emotional_triggers.map((t, i) => <Badge key={i} className="text-[9px] bg-rose-500/80">{t}</Badge>)}</div></div>
                          )}
                          {adAnalysis.common_ctas?.length > 0 && (
                            <div><span className="text-[9px] text-muted-foreground">Common CTAs:</span><div className="flex flex-wrap gap-1 mt-0.5">{adAnalysis.common_ctas.map((c, i) => <Badge key={i} className="text-[9px] bg-blue-500/80">{c}</Badge>)}</div></div>
                          )}
                        </CardContent>
                      </Card>
                      {/* Counter-Ads */}
                      {adAnalysis.counter_ads?.length > 0 && (
                        <Card className="border-emerald-500/30">
                          <CardContent className="p-3 space-y-2">
                            <h4 className="text-xs font-semibold flex items-center gap-1 text-emerald-600"><Sparkles className="h-3 w-3" /> AI Counter-Ads for CLT</h4>
                            {adAnalysis.counter_ads.map((ad, i) => (
                              <div key={i} className="p-2 bg-emerald-500/5 rounded border border-emerald-500/20 space-y-1">
                                <p className="text-[11px] font-bold">{ad.headline}</p>
                                <p className="text-[10px] text-muted-foreground">{ad.body}</p>
                                <div className="flex items-center justify-between pt-1">
                                  <div className="flex gap-1">
                                    <Badge className="text-[8px] bg-blue-500">{ad.cta}</Badge>
                                    <Badge variant="outline" className="text-[8px] capitalize">{ad.target_platform}</Badge>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5"
                                    onClick={() => { navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\nCTA: ${ad.cta}`); toast.success('Counter-ad copied!'); }}>
                                    <Copy className="h-2.5 w-2.5 mr-0.5" />Copy
                                  </Button>
                                </div>
                                {ad.angle && <p className="text-[9px] text-muted-foreground italic">Angle: {ad.angle}</p>}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                      {/* Strategic Recs */}
                      {adAnalysis.strategic_recommendations?.length > 0 && (
                        <Card>
                          <CardContent className="p-3 space-y-1.5">
                            <h4 className="text-xs font-semibold flex items-center gap-1"><Shield className="h-3 w-3 text-blue-500" /> Strategic Recommendations</h4>
                            {adAnalysis.strategic_recommendations.map((r, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                                <span className="text-blue-500 font-bold mt-px">{i + 1}.</span> {r}
                              </p>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : adAnalysis?.error ? (
                    <Card className="border-red-500/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-red-500">{adAnalysis.error}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Search for competitor ads, then click "AI Analyze" to get messaging patterns and counter-ad suggestions.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {!adSearchResults && (
              <div className="text-center py-12">
                <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Search the Facebook Ad Library to discover competitor ads</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Enter a competitor name, keyword, or industry term above</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ REVIEW SENTIMENT TAB ═══ */}
        <TabsContent value="reviews">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Analyze Google Reviews & GMB presence for each competitor. AI-powered sentiment analysis.</p>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competitors.map(comp => {
                  const rev = reviewsData[comp.id];
                  return (
                    <Card key={comp.id} data-testid={`review-card-${comp.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{comp.name}</h3>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => loadCachedData(comp.id)}>
                              Load Cached
                            </Button>
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => scrapeReviews(comp.id, comp.name)} disabled={scraping[`rev-${comp.id}`]}>
                              {scraping[`rev-${comp.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3 mr-1" />}
                              Analyze Reviews
                            </Button>
                          </div>
                        </div>
                        {rev?.sentiment && Object.keys(rev.sentiment).length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-xs">
                              {rev.sentiment.estimated_rating && (
                                <Badge variant="outline" className="text-amber-600 border-amber-500">
                                  <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />{rev.sentiment.estimated_rating}
                                </Badge>
                              )}
                              <Badge className={rev.sentiment.overall_sentiment === 'positive' ? 'bg-emerald-500' : rev.sentiment.overall_sentiment === 'negative' ? 'bg-red-500' : 'bg-amber-500'}>
                                {rev.sentiment.overall_sentiment || 'N/A'}
                              </Badge>
                              <span className="text-muted-foreground flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-emerald-500" />{rev.sentiment.positive || 0}</span>
                              <span className="text-muted-foreground flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-red-500" />{rev.sentiment.negative || 0}</span>
                              <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />{rev.sentiment.neutral || 0}</span>
                            </div>
                            {rev.sentiment.key_praise?.length > 0 && (
                              <div className="p-2 bg-emerald-500/5 rounded border border-emerald-500/20">
                                <p className="text-[10px] font-semibold text-emerald-600 mb-1">What People Like</p>
                                {rev.sentiment.key_praise.map((p, i) => <p key={i} className="text-[10px] text-muted-foreground">+ {p}</p>)}
                              </div>
                            )}
                            {rev.sentiment.key_complaints?.length > 0 && (
                              <div className="p-2 bg-red-500/5 rounded border border-red-500/20">
                                <p className="text-[10px] font-semibold text-red-600 mb-1">What People Dislike</p>
                                {rev.sentiment.key_complaints.map((p, i) => <p key={i} className="text-[10px] text-muted-foreground">- {p}</p>)}
                              </div>
                            )}
                            {rev.sentiment.themes?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {rev.sentiment.themes.map((t, i) => <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-3 text-center">No review data yet. Click "Analyze Reviews".</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ FB AD SCRAPER TAB (Legacy per-competitor) ═══ */}
        <TabsContent value="ads">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Per-competitor Facebook Ad Library scraping. For richer analysis, use the "Ad Intelligence" tab above.</p>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competitors.map(comp => {
                  const ad = adsData[comp.id];
                  return (
                    <Card key={comp.id} data-testid={`ads-card-${comp.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{comp.name}</h3>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => loadCachedData(comp.id)}>
                              Load Cached
                            </Button>
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => scrapeFbAds(comp.id, comp.name)} disabled={scraping[`ads-${comp.id}`]}>
                              {scraping[`ads-${comp.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                              Scrape Ads
                            </Button>
                          </div>
                        </div>
                        {ad?.ads?.length > 0 ? (
                          <ScrollArea className="max-h-[250px]">
                            <div className="space-y-2">
                              <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600">{ad.ads_found || ad.ads.length} ads found</Badge>
                              {ad.ads.map((a, i) => (
                                <div key={i} className="p-2 bg-muted/30 rounded border text-[11px]">
                                  {a.status && <Badge variant="outline" className="text-[9px] mb-1">{a.status}</Badge>}
                                  {a.text && <p className="text-muted-foreground">{a.text.slice(0, 250)}</p>}
                                  {a.cta && <p className="text-blue-500 font-medium mt-1">CTA: {a.cta}</p>}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <p className="text-xs text-muted-foreground py-3 text-center">No ad data yet. Click "Scrape Ads".</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ SOCIAL INTEL TAB ═══ */}
        <TabsContent value="social">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Scrape Instagram & Facebook for engagement signals, content themes, and audience insights.</p>
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
              <div className="grid grid-cols-1 gap-3">
                {competitors.map(comp => {
                  const soc = socialData[comp.id];
                  return (
                    <Card key={comp.id} data-testid={`social-card-${comp.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{comp.name}</h3>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => loadCachedData(comp.id)}>
                              Load Cached
                            </Button>
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => scrapeSocial(comp.id, comp.name)} disabled={scraping[`soc-${comp.id}`]}>
                              {scraping[`soc-${comp.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3 mr-1" />}
                              Scrape Social
                            </Button>
                          </div>
                        </div>
                        {soc?.platforms && Object.keys(soc.platforms).length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(soc.platforms).map(([platform, data]) => (
                              <div key={platform} className="p-2.5 bg-muted/30 rounded border">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Badge variant="outline" className="text-[10px] capitalize">{platform}</Badge>
                                  {data.error && <Badge variant="destructive" className="text-[9px]">Error</Badge>}
                                </div>
                                {data.title && <p className="text-xs font-medium mb-1">{data.title}</p>}
                                {data.meta && <p className="text-[10px] text-muted-foreground mb-2">{data.meta}</p>}
                                {data.engagement_signals?.length > 0 && (
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold text-blue-600">Engagement Signals</p>
                                    {data.engagement_signals.slice(0, 5).map((s, i) => (
                                      <p key={i} className="text-[10px] text-muted-foreground truncate">{s}</p>
                                    ))}
                                  </div>
                                )}
                                {data.content_themes?.length > 0 && (
                                  <div className="mt-2 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-purple-600">Content Themes</p>
                                    {data.content_themes.slice(0, 5).map((t, i) => (
                                      <p key={i} className="text-[10px] text-muted-foreground truncate">{t}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-3 text-center">No social data yet. Click "Scrape Social".</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
