import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Search, Plus, Users, User, ArrowLeft, Hash } from 'lucide-react';

const ROLE_COLORS = {
  super_admin: 'text-red-500', admin: 'text-orange-500', team_leader: 'text-purple-500',
  sales_executive: 'text-blue-500', cs_head: 'text-emerald-500', cs_agent: 'text-teal-500',
  mentor: 'text-yellow-600', hr: 'text-rose-500', finance: 'text-cyan-500',
};

const formatRole = (r) => (r || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
};

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/chat/conversations');
      setConversations(res.data || []);
    } catch (e) { console.error('Chat fetch error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchConversations();
      if (activeConvo) fetchMessages(activeConvo.id, true);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [activeConvo, fetchConversations]);

  const fetchMessages = async (convoId, silent = false) => {
    if (!silent) setMsgLoading(true);
    try {
      const res = await apiClient.get(`/chat/conversations/${convoId}/messages?limit=100`);
      setMessages(res.data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (e) { console.error(e); }
    finally { if (!silent) setMsgLoading(false); }
  };

  const openConversation = (convo) => {
    setActiveConvo(convo);
    setShowMobile(true);
    fetchMessages(convo.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || sending) return;
    setSending(true);
    try {
      const res = await apiClient.post(`/chat/conversations/${activeConvo.id}/messages`, { text: newMessage.trim() });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setTimeout(scrollToBottom, 50);
      fetchConversations();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = async (targetUser) => {
    try {
      const res = await apiClient.post('/chat/conversations', { participant_ids: [targetUser.id] });
      setShowNewChat(false);
      setUserSearch('');
      await fetchConversations();
      openConversation(res.data);
    } catch (e) { console.error(e); }
  };

  const openNewChatDialog = async () => {
    setShowNewChat(true);
    try {
      const res = await apiClient.get('/chat/users');
      setChatUsers(res.data || []);
    } catch (e) { console.error(e); }
  };

  const filteredUsers = chatUsers.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.department?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" data-testid="chat-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-500" /> Team Chat
          </h2>
          <p className="text-sm text-muted-foreground">Internal messaging across departments</p>
        </div>
        {totalUnread > 0 && <Badge className="bg-red-500 text-white">{totalUnread} unread</Badge>}
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Conversation List */}
        <Card className={`w-full md:w-80 flex-shrink-0 flex flex-col ${showMobile && activeConvo ? 'hidden md:flex' : 'flex'}`}>
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Conversations</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openNewChatDialog} data-testid="new-chat-btn">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 flex-1 overflow-auto">
            {loading ? (
              <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={openNewChatDialog}>Start a Chat</Button>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(c => (
                  <button
                    key={c.id}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors ${activeConvo?.id === c.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}
                    onClick={() => openConversation(c)}
                    data-testid={`convo-${c.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {c.is_group ? <Users className="h-4 w-4" /> : (c.display_name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{c.display_name}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{timeAgo(c.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.last_message_sender ? `${c.last_message_sender.split(' ')[0]}: ` : ''}{c.last_message_preview || 'No messages yet'}
                        </p>
                      </div>
                      {c.unread_count > 0 && (
                        <Badge className="bg-blue-500 text-white text-[10px] px-1.5 h-5 flex-shrink-0">{c.unread_count}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Area */}
        <Card className={`flex-1 flex flex-col min-h-0 ${!showMobile && !activeConvo ? 'hidden md:flex' : 'flex'} ${showMobile && activeConvo ? 'flex' : !activeConvo ? '' : ''}`}>
          {activeConvo ? (
            <>
              <CardHeader className="pb-2 px-4 pt-3 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => { setShowMobile(false); setActiveConvo(null); }}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {activeConvo.is_group ? <Users className="h-4 w-4" /> : (activeConvo.display_name?.charAt(0) || '?')}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{activeConvo.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeConvo.other_participants?.map(p => formatRole(p.role)).join(', ')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 px-4 py-3">
                  {msgLoading ? (
                    <p className="text-center text-muted-foreground text-sm py-8">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">Start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, idx) => {
                        const isOwn = msg.sender_id === user?.id;
                        const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {showAvatar && !isOwn && (
                                <p className="text-[11px] text-muted-foreground mb-0.5 ml-1">{msg.sender_name}</p>
                              )}
                              <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-muted rounded-bl-md'}`} data-testid={`msg-${msg.id}`}>
                                {msg.text}
                              </div>
                              <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <div className="border-t p-3 flex gap-2 flex-shrink-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1"
                    data-testid="chat-message-input"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || sending} data-testid="send-message-btn" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">Select a conversation or start a new one</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={openNewChatDialog}>
                  <Plus className="h-4 w-4 mr-1" /> New Chat
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Start New Conversation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or department..."
                className="pl-9"
                data-testid="chat-user-search"
              />
            </div>
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3"
                    onClick={() => startNewChat(u)}
                    data-testid={`chat-start-${u.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{u.full_name}</p>
                      <p className={`text-xs ${ROLE_COLORS[u.role] || 'text-muted-foreground'}`}>
                        {formatRole(u.role)} {u.department ? `- ${u.department}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">No users found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
