import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, Globe, LogIn, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Lobbies() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [privacy, setPrivacy] = useState('public');
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('id, host_id, privacy, lobby_code, status, created_at, user_profiles!matches_host_id_fkey(username)')
      .eq('status', 'waiting')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false });
    setMatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();

    // Realtime: update lobby list whenever matches change
    const channel = supabase
      .channel('lobbies_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchMatches)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const code = generateCode();
    const { data, error: err } = await supabase
      .from('matches')
      .insert({ host_id: user.id, privacy, lobby_code: code, status: 'waiting', game_state: buildInitialState() })
      .select()
      .single();

    if (err) { setError(err.message); setCreating(false); return; }
    navigate(`/match/${data.id}`);
  };

  const handleJoinPublic = async (matchId) => {
    setError(null);
    const { error: err } = await supabase
      .from('matches')
      .update({ guest_id: user.id, status: 'in_progress' })
      .eq('id', matchId)
      .eq('status', 'waiting');
    if (err) { setError(err.message); return; }
    navigate(`/match/${matchId}`);
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setError(null);
    const { data, error: err } = await supabase
      .from('matches')
      .select('id, status, host_id')
      .eq('lobby_code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .maybeSingle();

    if (err || !data) { setError('Lobby not found or already started.'); return; }
    if (data.host_id === user.id) { setError('You cannot join your own lobby.'); return; }
    await supabase.from('matches').update({ guest_id: user.id, status: 'in_progress' }).eq('id', data.id);
    navigate(`/match/${data.id}`);
  };

  return (
    <div className="container py-5">
      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h1 className="fw-bold mb-1" style={{ letterSpacing: '-1px' }}>Game Lobbies</h1>
            <p className="text-muted mb-0">Welcome back, <strong>{profile?.username}</strong></p>
          </div>
          <button onClick={fetchMatches} className="btn btn-link p-0 text-muted"><RefreshCw size={18} /></button>
        </div>

        {error && <div className="alert alert-danger rounded-3 py-2 px-3 mb-3">{error}</div>}

        <div className="row g-4">
          {/* Create match */}
          <div className="col-lg-4">
            <div className="glass-panel p-4 h-100">
              <h6 className="fw-bold mb-3">Create Match</h6>
              <div className="d-flex gap-2 mb-3">
                <button
                  onClick={() => setPrivacy('public')}
                  className={`btn btn-sm flex-grow-1 rounded-pill ${privacy === 'public' ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                  <Globe size={14} className="me-1" />Public
                </button>
                <button
                  onClick={() => setPrivacy('private')}
                  className={`btn btn-sm flex-grow-1 rounded-pill ${privacy === 'private' ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                  <Lock size={14} className="me-1" />Private
                </button>
              </div>
              <button onClick={handleCreate} className="apple-btn-primary" disabled={creating}>
                <Plus size={16} className="me-1" />
                {creating ? 'Creating…' : 'Create Lobby'}
              </button>
            </div>
          </div>

          {/* Join by code */}
          <div className="col-lg-4">
            <div className="glass-panel p-4 h-100">
              <h6 className="fw-bold mb-3">Join Private Match</h6>
              <form onSubmit={handleJoinByCode} className="d-flex flex-column gap-2">
                <input
                  type="text"
                  className="apple-input text-center"
                  placeholder="ENTER CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '1.1rem' }}
                />
                <button type="submit" className="apple-btn-primary">
                  <LogIn size={16} className="me-1" />Join
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Public lobby list */}
        <div className="mt-4">
          <h6 className="fw-semibold mb-3 text-muted text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.78rem' }}>
            Open Lobbies ({matches.length})
          </h6>
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : matches.length === 0 ? (
            <div className="glass-panel p-5 text-center text-muted">
              No open lobbies. Be the first to create one!
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {matches.map((m) => (
                <div key={m.id} className="glass-panel px-4 py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-semibold">{m.user_profiles?.username || 'Unknown'}</span>
                    <span className="text-muted ms-2" style={{ fontSize: '0.8rem' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(m.id)}
                    className="btn btn-primary btn-sm rounded-pill px-3"
                    disabled={m.host_id === user.id}
                  >
                    {m.host_id === user.id ? 'Your Lobby' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildInitialState() {
  return {
    phase: 'deployment',
    current_turn: 'host',
    host_ready: false,
    guest_ready: false,
    winner: null,
    board: Array(8).fill(null).map(() => Array(9).fill(null)),
    battle_log: [],
    flag_breakthrough: { host: null, guest: null },
  };
}
