import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sparkles, Loader2, Calendar, FileText, Instagram, Facebook,
  Linkedin, Mail, MessageSquare, Copy, Check, Zap, Target, Lightbulb,
} from 'lucide-react';

const PLATFORM_ICON = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  email: Mail,
  whatsapp: MessageSquare,
};

const TYPE_COLOR = {
  social_post: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  ad_copy: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
  story: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  reel: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  email: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  blog: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

export default function ContentStudioPage() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [focus, setFocus] = useState('general');
  const [copied, setCopied] = useState(null);

  const fetchContent = useCallback(async () => {
    try {
      const res = await apiClient.get('/intelligence/marketing-content');
      if (res.data.content) setContent(res.data.content);
    } catch { /* ignore */ }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const generateContent = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/intelligence/marketing-content', { focus });
      setContent(res.data.content || res.data);
      toast.success('Marketing content generated!');
    } catch { toast.error('Generation failed'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const ideas = content?.content_ideas || [];
  const themes = content?.campaign_themes || [];
  const diffs = content?.messaging_differentiation || [];
  const calendar = content?.content_calendar_suggestion || [];

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="content-studio-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated marketing content based on competitive intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={focus} onValueChange={setFocus}>
            <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="focus-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="paid_ads">Paid Ads</SelectItem>
              <SelectItem value="email_marketing">Email Marketing</SelectItem>
              <SelectItem value="competitor_counter">Counter Competitors</SelectItem>
              <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
              <SelectItem value="lead_generation">Lead Generation</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={generateContent} disabled={loading} data-testid="gen-content-btn">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            {loading ? 'Generating...' : 'Generate Content'}
          </Button>
        </div>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ideas.length > 0 ? (
        <div className="space-y-5">
          {/* Content Ideas Grid */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Content Ideas ({ideas.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ideas.map((idea, i) => {
                const PlatformIcon = PLATFORM_ICON[idea.platform] || FileText;
                const fullText = `${idea.headline}\n\n${idea.body}\n\n${idea.cta || ''}`;
                return (
                  <Card key={i} className="hover:border-pink-500/30 transition-colors" data-testid={`content-idea-${i}`}>
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${TYPE_COLOR[idea.type] || ''}`}>
                            {idea.type?.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize flex items-center gap-1">
                            <PlatformIcon className="h-2.5 w-2.5" />{idea.platform}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(fullText, i)}>
                          {copied === i ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <h3 className="text-sm font-semibold">{idea.headline}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{idea.body}</p>
                      {idea.cta && (
                        <p className="text-xs font-medium text-pink-600 bg-pink-500/5 px-2 py-1 rounded">{idea.cta}</p>
                      )}
                      {idea.competitor_counter && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1">
                          <Target className="h-2.5 w-2.5" /> {idea.competitor_counter}
                        </p>
                      )}
                      {idea.languages?.length > 0 && (
                        <div className="flex gap-1">
                          {idea.languages.map(l => <Badge key={l} variant="outline" className="text-[9px]">{l}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Campaign Themes */}
          {themes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-purple-500" /> Campaign Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {themes.map((t, i) => (
                    <div key={i} className="p-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg text-xs text-muted-foreground">{t}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messaging Differentiation */}
          {diffs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-pink-500" /> Messaging Differentiation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {diffs.map((d, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-pink-500 flex-shrink-0">+</span>{d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Content Calendar */}
          {calendar.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-500" /> Suggested Weekly Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {calendar.map((day, i) => (
                    <div key={i} className="p-2 bg-muted/30 rounded border text-center">
                      <p className="text-[10px] font-semibold text-blue-600">{day.day}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{day.content_type}</p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5">{day.theme}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No marketing content generated yet</p>
          <p className="text-xs mt-1">Select a focus area and click "Generate Content" to create AI-powered marketing ideas based on your competitor intelligence.</p>
          <Button size="sm" className="mt-4" onClick={generateContent} disabled={loading} data-testid="gen-content-empty-btn">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            {loading ? 'Generating...' : 'Generate Content Ideas'}
          </Button>
        </div>
      )}
    </div>
  );
}
