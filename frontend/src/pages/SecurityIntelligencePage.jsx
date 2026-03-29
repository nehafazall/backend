import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, MessageCircle, Users, Clock, Brain, Shield,
  TrendingUp, BookOpen, Smile, AlertTriangle, ChevronDown, ChevronUp,
  Search, Eye
} from 'lucide-react';

const MOOD_EMOJIS = {
  Excited: "🤩", Happy: "😊", Motivated: "💪", Calm: "😌", Neutral: "😐",
  Tired: "😴", Anxious: "😰", Stressed: "😓", Sad: "😢", Frustrated: "😤", Overwhelmed: "🤯",
};

// Categorize a message into usage type
const categorizeMessage = (msg) => {
  const text = (msg || '').toLowerCase();
  if (/policy|sop|rule|leave|holiday|handbook|guideline|procedure|hr/.test(text)) return 'policy';
  if (/learn|teach|train|course|how to|explain|tutorial|study/.test(text)) return 'learning';
  if (/motivat|inspire|encourage|push|goal|achieve|can i|believe|quote/.test(text)) return 'motivation';
  if (/joke|fun|haha|lol|meme|game|bore|chill|random|story|movie/.test(text)) return 'fun';
  if (/lead|student|commission|close|sale|enroll|target|data|number|crm|upgrade|attendance/.test(text)) return 'work';
  return 'general';
};

const CATEGORY_CONFIG = {
  learning: { label: 'Learning', icon: BookOpen, color: 'text-blue-600 bg-blue-50', badge: 'bg-blue-500' },
  motivation: { label: 'Motivation', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', badge: 'bg-emerald-500' },
  policy: { label: 'Company Policies', icon: Shield, color: 'text-purple-600 bg-purple-50', badge: 'bg-purple-500' },
  work: { label: 'Work/ERP Queries', icon: Brain, color: 'text-indigo-600 bg-indigo-50', badge: 'bg-indigo-500' },
  fun: { label: 'Fun/Casual', icon: Smile, color: 'text-amber-600 bg-amber-50', badge: 'bg-amber-500' },
  general: { label: 'General', icon: MessageCircle, color: 'text-gray-600 bg-gray-50', badge: 'bg-gray-500' },
};

const SecurityIntelligencePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('claret');
  const [claretChats, setClaretChats] = useState([]);
  const [claretProfiles, setClaretProfiles] = useState([]);
  const [teamConversations, setTeamConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedConv, setExpandedConv] = useState(null);
  const [convMessages, setConvMessages] = useState({});
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [chatsRes, profilesRes, teamRes] = await Promise.all([
        apiClient.get(`/security/claret-chats?days=${days}${selectedUser !== 'all' ? `&user_id=${selectedUser}` : ''}`),
        apiClient.get('/security/claret-profiles'),
        apiClient.get(`/security/team-chat-data?days=${days}`),
      ]);
      setClaretChats(chatsRes.data.chats || []);
      setClaretProfiles(profilesRes.data.profiles || []);
      setTeamConversations(teamRes.data.conversations || []);
    } catch (e) {
      console.error('Failed to fetch security data', e);
    }
    setLoading(false);
  }, [days, selectedUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Analyze Claret chats per user
  const claretAnalysis = React.useMemo(() => {
    const byUser = {};
    claretChats.forEach(chat => {
      const uid = chat.user_id;
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id: uid,
          user_name: chat.user_name || 'Unknown',
          total_messages: 0,
          user_messages: 0,
          categories: { learning: 0, motivation: 0, policy: 0, work: 0, fun: 0, general: 0 },
          moods: [],
          last_active: chat.created_at,
          chats: [],
        };
      }
      const entry = byUser[uid];
      entry.total_messages++;
      entry.chats.push(chat);
      if (chat.role === 'user') {
        entry.user_messages++;
        const cat = categorizeMessage(chat.message);
        entry.categories[cat]++;
      }
      if (chat.mood_scores?.mood_label) {
        entry.moods.push(chat.mood_scores);
      }
      if (chat.created_at > entry.last_active) entry.last_active = chat.created_at;
    });

    return Object.values(byUser).sort((a, b) => b.total_messages - a.total_messages);
  }, [claretChats]);

  // Get unique users for filter
  const uniqueUsers = React.useMemo(() => {
    const users = {};
    claretChats.forEach(c => {
      if (c.user_id && c.user_name) users[c.user_id] = c.user_name;
    });
    return Object.entries(users).map(([id, name]) => ({ id, name }));
  }, [claretChats]);

  // Get top category for a user
  const getTopCategory = (cats) => {
    let max = 0, top = 'general';
    Object.entries(cats).forEach(([k, v]) => { if (v > max) { max = v; top = k; } });
    return top;
  };

  // Load team chat messages for a conversation
  const loadConvMessages = async (convId) => {
    if (convMessages[convId]) return;
    try {
      const res = await apiClient.get(`/security/team-chat-messages/${convId}`);
      setConvMessages(prev => ({ ...prev, [convId]: res.data.messages || [] }));
    } catch { /* ignore */ }
  };

  // Average mood for a user
  const getAvgMood = (moods) => {
    if (!moods.length) return null;
    const sum = moods.reduce((acc, m) => ({
      energy: acc.energy + (m.energy_level || 5),
      stress: acc.stress + (m.stress_level || 5),
      motivation: acc.motivation + (m.motivation || 5),
      overall: acc.overall + (m.overall_mood || 5),
    }), { energy: 0, stress: 0, motivation: 0, overall: 0 });
    const n = moods.length;
    return {
      energy: (sum.energy / n).toFixed(1),
      stress: (sum.stress / n).toFixed(1),
      motivation: (sum.motivation / n).toFixed(1),
      overall: (sum.overall / n).toFixed(1),
      last_mood: moods[moods.length - 1]?.mood_label || 'Unknown',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1" data-testid="security-intelligence-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" /> People Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">Claret conversations, team chat monitoring, and mindset analysis</p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-[130px] h-9 text-xs" data-testid="days-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="claret" className="text-sm" data-testid="tab-claret">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Claret Intelligence
          </TabsTrigger>
          <TabsTrigger value="teamchat" className="text-sm" data-testid="tab-teamchat">
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Team Chat Monitor
          </TabsTrigger>
          <TabsTrigger value="profiles" className="text-sm" data-testid="tab-profiles">
            <Brain className="h-3.5 w-3.5 mr-1.5" /> Personality Profiles
          </TabsTrigger>
        </TabsList>

        {/* ════════ CLARET INTELLIGENCE TAB ════════ */}
        <TabsContent value="claret" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'general').map(([key, cfg]) => {
              const count = claretAnalysis.reduce((sum, u) => sum + (u.categories[key] || 0), 0);
              const Icon = cfg.icon;
              return (
                <Card key={key} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{cfg.label}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* User-wise breakdown */}
          <div className="space-y-3" data-testid="claret-user-breakdown">
            {claretAnalysis.map(userEntry => {
              const topCat = getTopCategory(userEntry.categories);
              const catCfg = CATEGORY_CONFIG[topCat];
              const TopIcon = catCfg.icon;
              const avgMood = getAvgMood(userEntry.moods);
              const isExpanded = expandedUser === userEntry.user_id;

              return (
                <Card key={userEntry.user_id} className="overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : userEntry.user_id)}
                    data-testid={`claret-user-${userEntry.user_id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${catCfg.color}`}>
                        <TopIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{userEntry.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {userEntry.user_messages} messages | Primary: <span className="font-medium">{catCfg.label}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Category breakdown mini badges */}
                      <div className="hidden md:flex items-center gap-1">
                        {Object.entries(userEntry.categories).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
                          <Badge key={cat} variant="outline" className={`text-[9px] ${CATEGORY_CONFIG[cat]?.badge} text-white`}>
                            {CATEGORY_CONFIG[cat]?.label?.slice(0, 4)} {count}
                          </Badge>
                        ))}
                      </div>

                      {avgMood && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {MOOD_EMOJIS[avgMood.last_mood] || "😐"} {avgMood.last_mood}
                        </span>
                      )}

                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4">
                      {/* Mood scores */}
                      {avgMood && (
                        <div className="grid grid-cols-4 gap-3 py-3">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Energy</p>
                            <p className="text-lg font-bold text-amber-500">{avgMood.energy}/10</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Stress</p>
                            <p className="text-lg font-bold text-red-500">{avgMood.stress}/10</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Motivation</p>
                            <p className="text-lg font-bold text-emerald-500">{avgMood.motivation}/10</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">Overall</p>
                            <p className="text-lg font-bold text-indigo-500">{avgMood.overall}/10</p>
                          </div>
                        </div>
                      )}

                      {/* Recent chat messages */}
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Conversations</p>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2">
                          {userEntry.chats.slice(-20).map((chat, i) => (
                            <div key={i} className={`text-xs p-2 rounded-lg ${chat.role === 'user' ? 'bg-indigo-50 text-indigo-900 ml-4' : 'bg-muted mr-4'}`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-medium">{chat.role === 'user' ? userEntry.user_name : 'Claret'}</span>
                                <span className="text-[9px] text-muted-foreground">{chat.created_at?.slice(0, 16).replace('T', ' ')}</span>
                              </div>
                              <p className="whitespace-pre-wrap">{chat.message?.slice(0, 300)}{chat.message?.length > 300 ? '...' : ''}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </Card>
              );
            })}

            {claretAnalysis.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No Claret conversations found for this period</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ════════ TEAM CHAT MONITOR TAB ════════ */}
        <TabsContent value="teamchat" className="space-y-4 mt-4">
          {/* Highlight high-activity chats */}
          {teamConversations.length > 0 ? (
            <div className="space-y-3" data-testid="team-chat-list">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {teamConversations.length} conversations found
                </p>
              </div>

              {teamConversations.map(conv => {
                const isHigh = conv.message_count > 50;
                const isMedium = conv.message_count > 20;
                const isExpanded2 = expandedConv === conv.id;

                return (
                  <Card key={conv.id} className={`overflow-hidden ${isHigh ? 'border-l-4 border-l-red-500' : isMedium ? 'border-l-4 border-l-amber-500' : ''}`}>
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => { setExpandedConv(isExpanded2 ? null : conv.id); loadConvMessages(conv.id); }}
                      data-testid={`team-conv-${conv.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isHigh ? 'bg-red-100 text-red-600' : isMedium ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{conv.name || 'Unnamed Chat'}</p>
                          <p className="text-xs text-muted-foreground">
                            {conv.participants?.length || 0} members | Updated: {conv.updated_at?.slice(0, 10)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={isHigh ? "destructive" : isMedium ? "default" : "secondary"} className="text-xs">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {conv.message_count} msgs
                        </Badge>
                        {isHigh && (
                          <Badge variant="outline" className="text-[9px] text-red-600 border-red-300">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> High Activity
                          </Badge>
                        )}
                        {isExpanded2 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {isExpanded2 && convMessages[conv.id] && (
                      <div className="border-t px-4 pb-4">
                        <ScrollArea className="max-h-[400px] mt-3">
                          <div className="space-y-2">
                            {convMessages[conv.id].map((msg, i) => (
                              <div key={i} className="text-xs p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-medium">{msg.sender_name || msg.sender_id || 'Unknown'}</span>
                                  <span className="text-[9px] text-muted-foreground">{msg.created_at?.slice(0, 16).replace('T', ' ')}</span>
                                </div>
                                <p className="whitespace-pre-wrap">{msg.content || msg.message || msg.text || ''}</p>
                              </div>
                            ))}
                            {convMessages[conv.id].length === 0 && (
                              <p className="text-center py-8 text-muted-foreground text-xs">No messages found</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No team chat conversations found for this period</p>
            </div>
          )}
        </TabsContent>

        {/* ════════ PERSONALITY PROFILES TAB ════════ */}
        <TabsContent value="profiles" className="space-y-4 mt-4">
          {claretProfiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="profile-grid">
              {claretProfiles.map(profile => (
                <Card key={profile.user_id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {(profile.nickname || profile.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{profile.employee_name || profile.name}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          {profile.designation} | {profile.department} | Nickname: "{profile.nickname}"
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-500 text-white text-[10px]">{profile.language}</Badge>
                      <Badge variant="outline" className="text-[10px]">Joined: {profile.created_at?.slice(0, 10)}</Badge>
                    </div>

                    {/* MCQ answers summary */}
                    {profile.answers?.mcq && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Personality Traits</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.answers.mcq.map((ans, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">{ans}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open answers */}
                    {profile.answers?.open?.filter(a => a).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">In Their Own Words</p>
                        {profile.answers.open.filter(a => a).map((ans, i) => (
                          <p key={i} className="text-xs italic text-muted-foreground bg-muted/50 rounded px-2 py-1">"{ans}"</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No personality profiles created yet. Employees will set up their Claret profile on first use.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityIntelligencePage;
