import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function GlobalChat() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load last 50 messages
    supabase
      .from('chat_messages')
      .select('id, username, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setMessages((data || []).reverse()));

    // Subscribe to new messages
    const channel = supabase
      .channel('global_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (!open) setUnread((n) => n + 1);
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !profile?.username) return;
    await supabase.from('chat_messages').insert({ username: profile.username, content: text.trim() });
    setText('');
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: '2rem', right: '5.5rem', zIndex: 1100,
          width: 48, height: 48, borderRadius: '50%',
          background: '#1D1D1F', color: '#fff',
          border: 'none', fontSize: '1rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: '#FF3B30',
            color: '#fff', borderRadius: '50%', width: 18, height: 18,
            fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
          }}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '2rem', zIndex: 1100,
          width: 320, borderRadius: 20,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center px-3 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Global Chat</span>
            <button onClick={() => setOpen(false)} className="btn btn-link p-0 text-muted"><X size={16} /></button>
          </div>

          {/* Messages */}
          <div style={{ height: 280, overflowY: 'auto', padding: '0.75rem' }}>
            {messages.map((m) => (
              <div key={m.id} className="mb-2">
                <span className="fw-semibold" style={{ fontSize: '0.75rem', color: 'var(--system-blue)' }}>{m.username} </span>
                <span style={{ fontSize: '0.82rem' }}>{m.content}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="d-flex gap-2 p-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <input
              className="apple-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 10 }}
              placeholder="Message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
            />
            <button type="submit" style={{ background: 'var(--system-blue)', border: 'none', borderRadius: 10, padding: '0 12px', color: '#fff', cursor: 'pointer' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
