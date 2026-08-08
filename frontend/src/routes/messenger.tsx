import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { authFetch, useAuth, API_BASE } from "@/lib/auth";
import { 
  Send, Search, MessageSquare, User, ShieldCheck, Clock, CheckCheck, 
  Sparkles, BookOpen, AlertCircle, RefreshCw 
} from "lucide-react";

export const Route = createFileRoute("/messenger")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      userId: search.userId ? Number(search.userId) : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Internal Messenger — Halyard Learn" }] }),
  component: MessengerPage,
});

interface ChatContact {
  id: number;
  full_name: string;
  email: string;
  avatar_initials: string;
  job_title: string;
  role_name: string;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  is_admin: boolean;
}

interface ChatMessageItem {
  id: number;
  sender: number;
  recipient: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_email: string;
  sender_initials: string;
  recipient_name: string;
}

function MessengerPage() {
  const { user } = useAuth();
  const searchParams = useSearch({ from: "/messenger" });
  
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isUserAdmin = Boolean(
    user?.is_platform_super_admin ||
    user?.role?.is_admin_role ||
    user?.role?.can_manage_users
  );

  // 1. Load Conversations / Contacts List
  const loadContacts = async () => {
    try {
      const res = await authFetch(`${API_BASE}/users/chat/conversations/`);
      if (res.ok) {
        const data: ChatContact[] = await res.json();
        setContacts(data);

        // Auto-select contact if passed in search param or default to first
        if (data.length > 0) {
          if (searchParams.userId) {
            const target = data.find(c => c.id === searchParams.userId);
            if (target) {
              setSelectedContact(target);
            } else if (!selectedContact) {
              setSelectedContact(data[0]);
            }
          } else if (!selectedContact) {
            setSelectedContact(data[0]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load contacts", e);
    } finally {
      setLoadingContacts(false);
    }
  };

  // 2. Load Messages for Selected Contact
  const loadMessages = async (contactId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/users/chat/messages/?with_user=${contactId}`);
      if (res.ok) {
        const data: ChatMessageItem[] = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initial Load + Auto Polling every 3 seconds for real-time messaging
  useEffect(() => {
    loadContacts();
    const interval = setInterval(() => {
      loadContacts();
      if (selectedContact) {
        loadMessages(selectedContact.id);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedContact?.id, searchParams.userId]);

  // When selected contact changes, load messages immediately
  useEffect(() => {
    if (selectedContact) {
      setLoadingMessages(true);
      loadMessages(selectedContact.id);
    }
  }, [selectedContact?.id]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Message Submission
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !selectedContact || sending) return;

    setSending(true);
    try {
      const res = await authFetch(`${API_BASE}/users/chat/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: selectedContact.id,
          message: textToSend.trim(),
        }),
      });

      if (res.ok) {
        const newMsg: ChatMessageItem = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setInputText("");
        loadContacts();
      }
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.role_name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <AppShell maxWidth="max-w-7xl">
      <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border/50 bg-muted/50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-indigo-600 text-foreground grid place-items-center shadow-md">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground leading-tight mb-1">Internal Messenger</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isUserAdmin ? "Direct coordination channel with organization learners & staff" : "Direct communication channel with your Organization Admin"}
              </p>
            </div>
          </div>

          <button
            onClick={() => { loadContacts(); if (selectedContact) loadMessages(selectedContact.id); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border hover:bg-muted/50 rounded-xl text-xs font-semibold text-muted-foreground transition-colors shadow-2xs"
          >
            <RefreshCw className="size-3.5 text-muted-foreground" /> Refresh
          </button>
        </div>

        {/* Main Messenger Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0">
          
          {/* Left Column: Conversations List */}
          <div className="md:col-span-4 lg:col-span-4 border-r border-border/50 flex flex-col bg-muted/50/40 min-h-0">
            {/* Search Input */}
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter messages & users..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Contacts List Scroll */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50/60 p-2">
              {loadingContacts ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading contacts...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="size-8 mx-auto text-foreground mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">No contacts found</p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContact?.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                          : "hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`size-11 rounded-2xl grid place-items-center font-bold text-xs ${
                          isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}>
                          {contact.avatar_initials}
                        </div>
                        {contact.is_admin && (
                          <div className={`absolute -bottom-1 -right-1 size-4 rounded-full grid place-items-center text-[9px] ${
                            isSelected ? "bg-amber-400 text-slate-950" : "bg-indigo-600 text-white"
                          }`} title="Organization Admin">
                            <ShieldCheck className="size-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-foreground"}`}>
                            {contact.full_name}
                          </span>
                          {contact.last_message_at && (
                            <span className={`text-[10px] ${isSelected ? "text-indigo-100" : "text-muted-foreground"}`}>
                              {new Date(contact.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className={`text-[11px] truncate pr-2 ${isSelected ? "text-indigo-100" : "text-muted-foreground"}`}>
                            {contact.last_message || `Start conversation with ${contact.role_name}...`}
                          </p>
                          {contact.unread_count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSelected ? "bg-white text-indigo-700" : "bg-rose-500 text-white"
                            }`}>
                              {contact.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className="md:col-span-8 lg:col-span-8 flex flex-col bg-card min-h-0">
            {selectedContact ? (
              <>
                {/* Active Chat Header */}
                <div className="px-6 py-3.5 border-b border-border/50 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-700 font-bold grid place-items-center text-xs border border-indigo-100">
                      {selectedContact.avatar_initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">{selectedContact.full_name}</h2>
                        {selectedContact.is_admin && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-100">
                            Org Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{selectedContact.email}</p>
                    </div>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/50/30">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">Loading conversation history...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16 p-6 max-w-sm mx-auto">
                      <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center mx-auto mb-3">
                        <Sparkles className="size-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">Direct Chat Connected</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Send a message below to start coordinating regarding course access, certifications, or system support.
                      </p>
                      
                      {/* Preset Quick Actions for Learners */}
                      {!isUserAdmin && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSendMessage("Hi Admin, I have requested access for a course. Could you please review and approve it?")}
                            className="text-left p-3 rounded-xl bg-card border border-border hover:border-indigo-500 text-xs font-semibold text-muted-foreground shadow-2xs transition-all flex items-center gap-2"
                          >
                            <BookOpen className="size-4 text-indigo-600 shrink-0" />
                            "Hi Admin, please approve my course access request."
                          </button>
                          <button
                            onClick={() => handleSendMessage("Hello Admin, I have a query regarding my learning paths and module access.")}
                            className="text-left p-3 rounded-xl bg-card border border-border hover:border-indigo-500 text-xs font-semibold text-muted-foreground shadow-2xs transition-all flex items-center gap-2"
                          >
                            <AlertCircle className="size-4 text-amber-500 shrink-0" />
                            "Hello Admin, I have a query regarding module access."
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-end gap-2 max-w-[80%]">
                            {!isMe && (
                              <div className="size-7 rounded-xl bg-slate-200 text-muted-foreground font-bold grid place-items-center text-[10px] shrink-0 mb-1">
                                {msg.sender_initials}
                              </div>
                            )}

                            <div
                              className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? "bg-indigo-600 text-white rounded-br-none shadow-sm"
                                  : "bg-card border border-border/80 text-foreground rounded-bl-none shadow-2xs"
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck className={`size-3 ${msg.is_read ? "text-indigo-600" : "text-foreground"}`} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-4 border-t border-border/50 bg-card">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Type your message to ${selectedContact.full_name}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={sending || !inputText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-foreground text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                    >
                      <span>Send</span>
                      <Send className="size-3.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center p-12 text-center">
                <div>
                  <MessageSquare className="size-12 text-foreground mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
                  <p className="text-xs text-muted-foreground">Choose a user from the list to start messaging.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
