import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, Plus, MessageSquare, Trash2, Menu, AlertTriangle, Wrench } from 'lucide-react';
import { aiApi, API_BASE_URL } from '../../api/endpoints.js';
import ChatMarkdown from '../common/ChatMarkdown.jsx';
import ChatToolCard from '../common/ChatToolCard.jsx';

const QUICK_PROMPTS = [
  'How are we doing right now?',
  'Build an audience of loyal Chennai customers',
  'Draft a win-back campaign for inactive customers',
  'Run the marketing agent on growing repeat purchases',
];

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const TOOL_LABELS = {
  build_audience_preview: 'Building audience preview',
  create_segment: 'Creating segment',
  generate_campaign_draft: 'Drafting campaign',
  create_campaign: 'Creating campaign',
  run_marketing_agent: 'Running marketing agent',
  get_analytics_summary: 'Pulling analytics',
  list_recent_campaigns: 'Fetching recent campaigns',
};

/**
 * Converts raw persisted conversation messages (which include 'assistant'
 * messages carrying toolCalls and 'tool' messages carrying toolResults/cards)
 * into a flat list suitable for rendering: plain user/assistant bubbles, with
 * any cards attached to the final assistant text message that follows them.
 */
const toDisplayMessages = (raw = []) => {
  const out = [];
  let pendingCards = [];

  raw.forEach((m) => {
    if (m.role === 'tool') {
      if (Array.isArray(m.cards)) pendingCards = pendingCards.concat(m.cards);
      return;
    }
    if (m.role === 'assistant' && Array.isArray(m.toolCalls) && m.toolCalls.length && !m.content) {
      // intermediate tool-call turn with no visible text - skip
      return;
    }
    const msg = { ...m };
    if (pendingCards.length && m.role === 'assistant') {
      msg.cards = (msg.cards || []).concat(pendingCards);
      pendingCards = [];
    }
    out.push(msg);
  });

  return out;
};

const AICopilotSidebar = () => {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);
  const [toolStatus, setToolStatus] = useState('');

  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const conversationIdRef = useRef(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await aiApi.listConversations();
      setConversations(data.data || []);
    } catch {
      // Non-fatal - history sidebar just stays empty
    }
  }, []);

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  const openConversation = async (id) => {
    setError('');
    setHistoryOpen(false);
    try {
      const { data } = await aiApi.getConversation(id);
      setConversationId(data.data.id);
      setMessages(toDisplayMessages(data.data.messages || []));
    } catch {
      setError('Could not load that conversation.');
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setError('');
    setHistoryOpen(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) startNewConversation();
    } catch {
      // ignore
    }
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setInput('');
    setError('');
    setUsedFallback(false);
    setToolStatus('');

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setToolStatus('Thinking…');

    let assistantContent = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString(), streaming: true }]);

    try {
      const token = localStorage.getItem('xeno_token');
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, conversationId: conversationIdRef.current }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          let eventType = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;

          let data;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === 'meta') {
            if (data.conversationId && !conversationIdRef.current) {
              setConversationId(data.conversationId);
              conversationIdRef.current = data.conversationId;
            }
          } else if (eventType === 'tool_call') {
            setToolStatus(TOOL_LABELS[data.name] || 'Working on it…');
          } else if (eventType === 'tool_result') {
            setToolStatus('');
            const cards = data.cards || [];
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, cards: (last.cards || []).concat(cards) };
              }
              return next;
            });
          } else if (eventType === 'chunk') {
            setToolStatus('');
            assistantContent += data.text;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, content: assistantContent, streaming: true };
              }
              return next;
            });
          } else if (eventType === 'done') {
            if (data.conversationId) {
              setConversationId(data.conversationId);
              conversationIdRef.current = data.conversationId;
            }
            setUsedFallback(!!data.usedFallback);
            setToolStatus('');
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: data.message?.content || assistantContent,
                  cards: (data.message?.cards && data.message.cards.length ? data.message.cards : last.cards) || undefined,
                  timestamp: data.message?.timestamp || last.timestamp,
                  streaming: false,
                };
              }
              return next;
            });
            loadConversations();
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Something went wrong reaching the AI assistant. Please try again.');
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          next.pop();
        } else if (last && last.role === 'assistant') {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
    } finally {
      setSending(false);
      setToolStatus('');
      setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m)));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button. Lower z-index than modals/sidebars (z-30) and offset
          from the edge so it never sits directly over right-aligned pagination controls,
          which live inside page content with normal z-index. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-glow flex items-center justify-center text-white hover:scale-105 transition-transform"
          title="AI Assistant"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-surface-darkCard shadow-2xl flex animate-slide-up">
            {historyOpen && (
              <div className="w-56 border-r border-gray-100 dark:border-surface-darkBorder flex flex-col bg-gray-50 dark:bg-surface-dark">
                <div className="px-3 py-3 border-b border-gray-100 dark:border-surface-darkBorder flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">History</span>
                  <button onClick={startNewConversation} title="New chat" className="btn-ghost p-1.5">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-3">No conversations yet</p>
                  )}
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className={`w-full text-left px-3 py-2.5 text-xs flex items-start gap-2 group hover:bg-gray-100 dark:hover:bg-surface-darkBorder transition ${
                        conversationId === c.id ? 'bg-brand-50 dark:bg-brand-900/30' : ''
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
                      <span className="flex-1 line-clamp-2 text-gray-700 dark:text-gray-200">{c.title}</span>
                      <span
                        onClick={(e) => handleDelete(c.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-surface-darkBorder flex items-center justify-between bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setHistoryOpen((v) => !v)} className="p-1 rounded-lg hover:bg-white/10 transition shrink-0">
                    <Menu className="w-4 h-4" />
                  </button>
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <h3 className="font-display font-semibold truncate">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={startNewConversation} title="New chat" className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ask me anything about your customers, campaigns, segments, or analytics. I can also build audiences, draft and create campaigns, and run the marketing agent for you - right here in chat.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => sendMessage(p)}
                          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-surface-darkBorder text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 transition"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        m.role === 'user'
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-50 dark:bg-surface-darkBorder border border-gray-100 dark:border-transparent'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      ) : m.content ? (
                        <ChatMarkdown content={m.content} />
                      ) : i === messages.length - 1 && sending && toolStatus ? (
                        <div className="flex items-center gap-2 py-1 text-gray-500 dark:text-gray-300 text-xs">
                          <Wrench className="w-3.5 h-3.5 animate-pulse text-brand-500" />
                          {toolStatus}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1 text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                        </div>
                      )}
                      {m.timestamp && (
                        <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatTime(m.timestamp)}
                        </p>
                      )}
                    </div>
                    {m.role === 'assistant' && Array.isArray(m.cards) && m.cards.length > 0 && (
                      <div className="w-full max-w-[95%] space-y-2">
                        {m.cards.map((card, ci) => (
                          <ChatToolCard key={ci} card={card} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {usedFallback && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    AI service is temporarily limited - showing a simplified response.
                  </div>
                )}

                {error && <p className="text-sm text-rose-500">{error}</p>}
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-surface-darkBorder">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about customers, campaigns, segments..."
                    rows={1}
                    className="input-field resize-none max-h-28"
                  />
                  <button onClick={() => sendMessage()} className="btn-primary px-3.5 shrink-0" disabled={sending || !input.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AICopilotSidebar;
