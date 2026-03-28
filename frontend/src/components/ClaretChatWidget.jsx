import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, apiClient } from "@/lib/api";
import { Send, X, Mic, Volume2, VolumeX, Sparkles, MessageCircle, Minimize2 } from "lucide-react";

const MOOD_EMOJIS = {
  Excited: "🤩", Happy: "😊", Motivated: "💪", Calm: "😌", Neutral: "😐",
  Tired: "😴", Anxious: "😰", Stressed: "😓", Sad: "😢", Frustrated: "😤", Overwhelmed: "🤯",
};

const ClaretChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [currentMood, setCurrentMood] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user) {
      const sid = `claret-${user.id}-${new Date().toISOString().slice(0, 10)}`;
      setSessionId(sid);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await apiClient.get(`/claret/chat/history?session_id=${sessionId}&limit=30`);
      if (res.data.chats?.length > 0) {
        setMessages(res.data.chats.map(c => ({
          role: c.role,
          message: c.message,
          mood_scores: c.mood_scores,
          time: c.created_at,
        })));
        const lastMood = res.data.chats.filter(c => c.mood_scores?.mood_label).pop();
        if (lastMood) setCurrentMood(lastMood.mood_scores);
      } else {
        setMessages([{
          role: "assistant",
          message: `Hey ${user?.full_name?.split(" ")[0] || "there"}! I'm Claret, your buddy here at CLT Synapse. Ask me anything about the ERP, company policies, or just chat! Kya haal hai? 😊`,
          time: new Date().toISOString(),
        }]);
      }
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", message: userMsg, time: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await apiClient.post("/claret/chat", {
        message: userMsg,
        session_id: sessionId,
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        message: res.data.message,
        mood_scores: res.data.mood_scores,
        suggested_actions: res.data.suggested_actions,
        time: new Date().toISOString(),
      }]);
      if (res.data.mood_scores?.mood_label) {
        setCurrentMood(res.data.mood_scores);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        message: "Oops, something went wrong! Try again? 🙏",
        time: new Date().toISOString(),
      }]);
    }
    setLoading(false);
  };

  const speakText = (text) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const translateToMalayalam = async (text) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/claret/chat", {
        message: `Translate this to Malayalam: "${text}"`,
        session_id: sessionId,
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        message: res.data.message,
        time: new Date().toISOString(),
      }]);
    } catch {}
    setLoading(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          data-testid="claret-toggle-btn"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          {currentMood && (
            <span className="absolute -top-1 -right-1 text-sm">{MOOD_EMOJIS[currentMood.mood_label] || "😊"}</span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden bg-background" data-testid="claret-chat-panel">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Claret</p>
                <p className="text-[10px] text-white/70">Your AI buddy at CLT</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {currentMood && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mr-1">
                  {MOOD_EMOJIS[currentMood.mood_label] || "😊"} {currentMood.mood_label}
                </span>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" data-testid="claret-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  {msg.role === "assistant" && (
                    <div className="flex gap-1 mt-1.5 pt-1 border-t border-border/20">
                      <button
                        onClick={() => speakText(msg.message)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-background/50 hover:bg-background/80 transition-colors flex items-center gap-0.5"
                        title="Read aloud"
                      >
                        {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        {isSpeaking ? "Stop" : "Listen"}
                      </button>
                      <button
                        onClick={() => translateToMalayalam(msg.message)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-background/50 hover:bg-background/80 transition-colors"
                        title="Translate to Malayalam"
                      >
                        ML
                      </button>
                    </div>
                  )}
                  {msg.suggested_actions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.suggested_actions.map((a, j) => (
                        <button
                          key={j}
                          onClick={() => { setInput(a); inputRef.current?.focus(); }}
                          className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 shrink-0">
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl border px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Chat with Claret..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                data-testid="claret-input"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all"
                data-testid="claret-send-btn"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClaretChatWidget;
