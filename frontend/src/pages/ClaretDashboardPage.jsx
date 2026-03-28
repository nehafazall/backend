import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  Sparkles, TrendingUp, Users, Calendar, MessageCircle,
  Palette, ChevronDown, BarChart3, Brain, Heart, Zap,
  SmilePlus, Frown, Meh, Smile, Laugh
} from "lucide-react";

const MOOD_EMOJIS = {
  Excited: "🤩", Happy: "😊", Motivated: "💪", Calm: "😌", Neutral: "😐",
  Tired: "😴", Anxious: "😰", Stressed: "😓", Sad: "😢", Frustrated: "😤", Overwhelmed: "🤯",
};

const MOOD_COLORS = {
  Excited: "text-yellow-500 bg-yellow-50", Happy: "text-emerald-500 bg-emerald-50",
  Motivated: "text-blue-500 bg-blue-50", Calm: "text-teal-500 bg-teal-50",
  Neutral: "text-slate-500 bg-slate-50", Tired: "text-gray-500 bg-gray-50",
  Anxious: "text-amber-500 bg-amber-50", Stressed: "text-orange-500 bg-orange-50",
  Sad: "text-indigo-500 bg-indigo-50", Frustrated: "text-red-500 bg-red-50",
  Overwhelmed: "text-purple-500 bg-purple-50",
};

const PRESETS = [
  { name: "Indigo Vibes", primary: "#6366f1", accent: "#f59e0b", bg: "from-indigo-500/10 to-purple-500/10" },
  { name: "Ocean Breeze", primary: "#0ea5e9", accent: "#10b981", bg: "from-cyan-500/10 to-blue-500/10" },
  { name: "Sunset Glow", primary: "#f97316", accent: "#ec4899", bg: "from-orange-500/10 to-pink-500/10" },
  { name: "Forest Calm", primary: "#22c55e", accent: "#84cc16", bg: "from-emerald-500/10 to-lime-500/10" },
  { name: "Berry Burst", primary: "#a855f7", accent: "#f43f5e", bg: "from-purple-500/10 to-rose-500/10" },
  { name: "Midnight", primary: "#3b82f6", accent: "#8b5cf6", bg: "from-blue-500/10 to-violet-500/10" },
];

export default function ClaretDashboardPage() {
  const { user } = useAuth();
  const [myScores, setMyScores] = useState([]);
  const [teamMoods, setTeamMoods] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("personal");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isAdmin = ["super_admin", "coo", "hr"].includes(user?.role);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [scoresRes, settingsRes] = await Promise.all([
        apiClient.get("/claret/mood/my-scores?days=30"),
        apiClient.get("/claret/settings"),
      ]);
      setMyScores(scoresRes.data.scores || []);
      setSettings(settingsRes.data);

      if (isAdmin) {
        const [teamRes, analyticsRes] = await Promise.all([
          apiClient.get("/claret/mood/team-overview"),
          apiClient.get("/claret/mood/analytics?days=30"),
        ]);
        setTeamMoods(teamRes.data.team_moods || []);
        setAnalytics(analyticsRes.data);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const updateTheme = async (preset) => {
    try {
      await apiClient.put("/claret/settings", {
        theme_color: preset.primary,
        accent_color: preset.accent,
        bg_gradient: preset.bg,
      });
      setSettings(prev => ({ ...prev, theme_color: preset.primary, accent_color: preset.accent, bg_gradient: preset.bg }));
      toast.success(`Theme changed to ${preset.name}!`);
    } catch {}
  };

  const latestMood = myScores.length > 0 ? myScores[myScores.length - 1] : null;
  const bgGradient = settings?.bg_gradient || "from-indigo-500/10 to-purple-500/10";
  const themeColor = settings?.theme_color || "#6366f1";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Sparkles className="w-8 h-8 animate-pulse text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 max-w-7xl mx-auto`} data-testid="claret-dashboard">
      {/* Header with mood indicator */}
      <div className={`rounded-2xl bg-gradient-to-br ${bgGradient} p-6 border`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Claret Dashboard</h1>
              <p className="text-sm text-muted-foreground">Mood tracking, wellness & engagement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Current mood badge */}
            {latestMood && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${MOOD_COLORS[latestMood.mood_label] || "bg-slate-50"}`} data-testid="current-mood-badge">
                <span className="text-2xl">{MOOD_EMOJIS[latestMood.mood_label] || "😊"}</span>
                <div>
                  <p className="text-xs font-semibold">{latestMood.mood_label}</p>
                  <p className="text-[10px] text-muted-foreground">{latestMood.overall_score}/10</p>
                </div>
              </div>
            )}
            {/* Theme picker */}
            <Button size="sm" variant="outline" onClick={() => setShowColorPicker(!showColorPicker)} data-testid="theme-picker-btn">
              <Palette className="w-4 h-4 mr-1" /> Theme
            </Button>
          </div>
        </div>

        {/* Color presets */}
        {showColorPicker && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Choose Dashboard Theme</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => updateTheme(p)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:shadow-md bg-gradient-to-r ${p.bg}`}
                  style={{ borderColor: p.primary + "40" }}
                >
                  <span className="w-3 h-3 rounded-full inline-block mr-1.5" style={{ backgroundColor: p.primary }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Toggle */}
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {[
            { id: "personal", label: "My Wellness", icon: Heart },
            { id: "team", label: "Team Overview", icon: Users },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                view === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Personal View */}
      {view === "personal" && (
        <div className="space-y-4">
          {/* Score cards */}
          {latestMood?.mood_scores && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: "energy_level", label: "Energy", icon: Zap, color: "text-yellow-500" },
                { key: "stress_level", label: "Stress", icon: Brain, color: "text-red-500", invert: true },
                { key: "motivation", label: "Motivation", icon: TrendingUp, color: "text-blue-500" },
                { key: "happiness", label: "Happiness", icon: Heart, color: "text-pink-500" },
                { key: "overall_mood", label: "Overall", icon: Sparkles, color: "text-indigo-500" },
              ].map(s => {
                const val = latestMood.mood_scores[s.key] || 5;
                return (
                  <Card key={s.key} className="text-center">
                    <CardContent className="pt-4 pb-3">
                      <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                      <p className="text-2xl font-bold">{s.invert ? 10 - val : val}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(s.invert ? 10 - val : val) * 10}%`, backgroundColor: themeColor }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Mood History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Mood Journey (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {myScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Start chatting with Claret to track your mood!</p>
                  <p className="text-xs mt-1">Your daily mood scores will appear here</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {myScores.map((s, i) => (
                    <div
                      key={i}
                      className={`w-10 h-12 rounded-lg flex flex-col items-center justify-center text-center ${MOOD_COLORS[s.mood_label] || "bg-slate-50"}`}
                      title={`${s.date}: ${s.mood_label} (${s.overall_score}/10)`}
                    >
                      <span className="text-sm">{MOOD_EMOJIS[s.mood_label] || "😐"}</span>
                      <span className="text-[8px] text-muted-foreground">{new Date(s.date).getDate()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Overview (Admin) */}
      {view === "team" && isAdmin && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMoods.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No mood data yet. Team members need to chat with Claret first!</p>
              </div>
            ) : teamMoods.map((tm, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow" data-testid={`team-mood-${tm.user_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${MOOD_COLORS[tm.mood_label] || "bg-slate-50"}`}>
                      {MOOD_EMOJIS[tm.mood_label] || "😐"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{tm.user_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{tm.mood_label}</Badge>
                        <span className="text-xs text-muted-foreground">{tm.overall_score}/10</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tm.date}</p>
                    </div>
                    {/* Score bars */}
                    <div className="space-y-1 w-20">
                      {["energy_level", "motivation", "happiness"].map(k => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-[8px] text-muted-foreground w-4">{k[0].toUpperCase()}</span>
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(tm.mood_scores?.[k] || 5) * 10}%`, backgroundColor: themeColor }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Analytics (Admin) */}
      {view === "analytics" && isAdmin && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                <p className="text-3xl font-bold" style={{ color: themeColor }}>{analytics.avg_mood}</p>
                <p className="text-xs text-muted-foreground">Avg Mood Score</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                <p className="text-3xl font-bold">{analytics.total_interactions}</p>
                <p className="text-xs text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                <p className="text-3xl font-bold">{teamMoods.length}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                <p className="text-3xl font-bold">{teamMoods.filter(t => t.overall_score >= 7).length}</p>
                <p className="text-xs text-muted-foreground">Happy Team Members</p>
              </CardContent>
            </Card>
          </div>

          {/* Mood distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mood Distribution (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(analytics.mood_distribution || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => (
                    <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${MOOD_COLORS[label] || "bg-slate-50"}`}>
                      <span className="text-lg">{MOOD_EMOJIS[label] || "😐"}</span>
                      <div>
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{count} days</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          {analytics.daily_trend?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Mood Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {analytics.daily_trend.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${d.avg_score * 10}%`,
                        backgroundColor: d.avg_score >= 7 ? "#22c55e" : d.avg_score >= 4 ? themeColor : "#ef4444",
                        minWidth: "4px",
                      }}
                      title={`${d.date}: ${d.avg_score}/10`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>{analytics.daily_trend[0]?.date?.slice(5)}</span>
                  <span>{analytics.daily_trend[analytics.daily_trend.length - 1]?.date?.slice(5)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
