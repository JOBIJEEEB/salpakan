import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, Globe, LogIn, RefreshCw, Trophy, Users, Shield, Target, Clock, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getRankTier, getNextTier, getProgressToNext, formatRR } from '../lib/rankUtils';
import Swal from 'sweetalert2';

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
  const [showModal, setShowModal] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [gameMode, setGameMode] = useState('Normal'); // Blitz, Normal, Competitive
  const [privacy, setPrivacy] = useState('public');
  const [error, setError] = useState(null);

  const tier = profile ? getRankTier(profile.command_rating) : null;
  const nextTier = profile ? getNextTier(profile.command_rating) : null;
  const progress = profile ? getProgressToNext(profile.command_rating) : 0;

  const fetchMatches = async () => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('matches')
      .select('id, host_id, privacy, lobby_code, status, created_at, game_state, user_profiles!matches_host_id_fkey(username, command_rating, avatar_style, avatar_seed)')
      .eq('privacy', 'public')
      .order('created_at', { ascending: false })
      .limit(30);

    if (fetchErr) {
      console.error('Fetch lobbies error:', fetchErr);
    } else {
      const list = (data || []).filter(m => m.status !== 'completed' && !m.game_state?.winner);
      setMatches(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    // Check for active match auto-redirect
    // Check for active match auto-redirect (only if truly in progress and no winner)
    supabase
      .from('matches')
      .select('id, status, winner, game_state')
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .eq('status', 'in_progress')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const hasWinner = data.winner || data.game_state?.winner;
          if (!hasWinner && data.status !== 'completed') {
            navigate(`/match/${data.id}`);
          }
        }
      });

    fetchMatches();

    const channel = supabase
      .channel('lobbies_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchMatches)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!lobbyName.trim()) { setError('Lobby name is required.'); return; }
    setCreating(true);
    setError(null);
    const code = generateCode();
    const initialState = buildInitialState();
    initialState.lobby_name = lobbyName.trim();
    initialState.game_mode = gameMode;

    const { data, error: err } = await supabase
      .from('matches')
      .insert({ host_id: user.id, privacy, lobby_code: code, status: 'waiting', game_state: initialState })
      .select()
      .single();

    if (err) { setError(err.message); setCreating(false); return; }
    setShowModal(false);
    navigate(`/match/${data.id}`);
  };

  const handleJoinPublic = async (matchId, hostId) => {
    if (hostId === user.id) { navigate(`/match/${matchId}`); return; }
    const { error: err } = await supabase
      .from('matches')
      .update({ guest_id: user.id, status: 'in_progress' })
      .eq('id', matchId)
      .eq('status', 'waiting');
    if (err) {
      Swal.fire('Failed to Join', err.message, 'error');
      return;
    }
    navigate(`/match/${matchId}`);
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) { setError('Please enter a valid 6-character code.'); return; }

    const { data, error: err } = await supabase
      .from('matches')
      .select('id, status, host_id, guest_id, game_state')
      .eq('lobby_code', code)
      .maybeSingle();

    if (err || !data) { setError('Lobby not found. Double-check your code.'); return; }
    if (data.host_id === user.id || data.guest_id === user.id) { navigate(`/match/${data.id}`); return; }
    if (data.guest_id) { setError('This lobby already has another player.'); return; }
    if (data.status === 'completed' || data.game_state?.winner) {
      Swal.fire('Match Ended', 'This match has already been completed.', 'info');
      return;
    }

    await supabase.from('matches').update({ guest_id: user.id, status: 'in_progress' }).eq('id', data.id);
    navigate(`/match/${data.id}`);
  };

  return (
    <div className="page-container fit-screen">
      <div className="flex-grow-1 overflow-auto p-0 m-0">
        {/* ── COMMAND DASHBOARD HEADER ────────────────────────────────────────── */}
        <div className="dashboard-header-premium mb-4 pb-4">
          <div className="dashboard-mesh-bg" />

          <div className="container position-relative z-1 py-4 py-lg-5">
            <div className="row align-items-center g-4">
              {/* Profile Side */}
              <div className="col-lg-4">
                <div className="d-flex align-items-center gap-4 animate-slide-in">
                  <div className="position-relative">
                    <div className="avatar-ring-animated" />
                    <div className="lobby-profile-avatar-lg shadow-xl">
                      <img
                        src={`https://api.dicebear.com/7.x/${profile?.avatar_style || 'notionists'}/svg?seed=${profile?.avatar_seed || profile?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                        alt="Profile"
                      />
                    </div>
                  </div>

                  <div>
                    <h1 className="text-start display-6 fw-bold mb-0 header-gradient-text" style={{ letterSpacing: '-2px' }}>
                      Game Lobby
                    </h1>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted fw-medium small">Player: <b>{profile?.username}</b></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactical Status Row (Right) */}
              <div className="col-lg-8">
                <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-3 animate-fade-in-delayed">
                  {/* Hero Rank Module (Compact) */}
                  <div className="hero-rank-module p-2 d-flex align-items-center gap-3"
                    style={{ minWidth: 380, background: 'rgba(255,255,255,0.95)' }}>
                    <div className="rounded-3 overflow-hidden shadow-sm" style={{ width: 32, height: 32, background: '#fff', border: '1px solid #000', flexShrink: 0 }}>
                      <img src={tier?.icon} alt="Rank" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-black text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>
                          Rank · <span style={{ color: tier?.color }}>{tier?.name}</span>
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#007AFF', fontWeight: 800 }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ background: '#F2F2F7', borderRadius: 999, height: 5, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${tier?.color || '#007AFF'} 0%, #007AFF 100%)`,
                          transition: 'width 1.5s cubic-bezier(0.165, 0.84, 0.44, 1)'
                        }} />
                      </div>
                    </div>
                    <div className="px-2 border-start text-center">
                      <div className="text-muted fw-bold" style={{ fontSize: '0.45rem', lineHeight: 1 }}>RATING</div>
                      <div className="fw-black" style={{ fontSize: '0.8rem', lineHeight: 1 }}>{formatRR(profile?.command_rating || 0)}</div>
                    </div>
                  </div>

                  {/* Wins Pill */}
                  <div className="glass-stat-pill stat-card-green m-0">
                    <div className="d-flex align-items-center gap-3">
                      <div className="stat-icon-wrapper" style={{ color: '#34C759' }}>
                        <Trophy size={18} />
                      </div>
                      <div className="text-start">
                        <div className="stat-value">{profile?.wins || 0}</div>
                        <div className="stat-label">Wins</div>
                      </div>
                    </div>
                  </div>

                  {/* Losses Pill */}
                  <div className="glass-stat-pill stat-card-red m-0">
                    <div className="d-flex align-items-center gap-3">
                      <div className="stat-icon-wrapper" style={{ color: '#FF3B30' }}>
                        <Zap size={18} />
                      </div>
                      <div className="text-start">
                        <div className="stat-value">{profile?.losses || 0}</div>
                        <div className="stat-label">Losses</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-4">
          {error && (
            <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex align-items-center gap-2 mb-4">
              <span style={{ fontSize: '1.2rem' }}>⚠️</span> {error}
            </div>
          )}

          <div className="row g-4">

            {/* ── CREATE CARD ────────────────────────────────────────────────── */}
            <div className="col-lg-7">
              <div className="glass-panel p-4 h-100 position-relative overflow-hidden create-match-card-premium" style={{ minHeight: 300 }}>
                <div className="create-card-mesh" />
                <div className="position-relative z-1">
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <h4 className="fw-bold mb-1">Create Match</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Host a new game and invite players.</p>
                    </div>
                    <div className="d-flex gap-2 p-1 bg-white bg-opacity-10 rounded-pill">
                      <button onClick={() => setPrivacy('public')}
                        style={{
                          padding: '6px 16px', fontSize: '0.75rem', fontWeight: 700, border: 'none', borderRadius: 999, transition: 'all 0.2s',
                          background: privacy === 'public' ? '#007AFF' : 'transparent', color: privacy === 'public' ? '#fff' : 'rgba(255,255,255,0.5)'
                        }}>
                        <Globe size={13} className="me-1" /> Public
                      </button>
                      <button onClick={() => setPrivacy('private')}
                        style={{
                          padding: '6px 16px', fontSize: '0.75rem', fontWeight: 700, border: 'none', borderRadius: 999, transition: 'all 0.2s',
                          background: privacy === 'private' ? '#007AFF' : 'transparent', color: privacy === 'private' ? '#fff' : 'rgba(255,255,255,0.5)'
                        }}>
                        <Lock size={13} className="me-1" /> Private
                      </button>
                    </div>
                  </div>

                  <div className="d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    {[
                      { id: 'Blitz', icon: <Zap size={20} />, label: 'Blitz', desc: '30s per turn' },
                      { id: 'Normal', icon: <Clock size={20} />, label: 'Normal', desc: '1m per turn' },
                      { id: 'Competitive', icon: <Target size={20} />, label: 'Competitive', desc: '2m per turn' }
                    ].map(m => (
                      <div key={m.id} onClick={() => setGameMode(m.id)}
                        className={`p-3 rounded-4 cursor-pointer border-2 transition-all ${gameMode === m.id ? 'border-white bg-primary bg-opacity-25' : 'border-transparent bg-white bg-opacity-10'}`}
                        style={{ cursor: 'pointer', border: '2px solid transparent' }}>
                        <div className={`mb-2 ${gameMode === m.id ? 'text-white' : 'text-white-50'}`}>{m.icon}</div>
                        <div className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>{m.label}</div>
                        <div className="text-white-50" style={{ fontSize: '0.75rem' }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setShowModal(true)} className="apple-btn-primary mt-4 py-3 shadow-lg">
                    <Plus size={20} className="me-2" /> Start Setup
                  </button>
                </div>

                <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, color: '#FFFFFF' }}>
                  <Users size={240} />
                </div>
              </div>
            </div>

            {/* ── JOIN BY CODE CARD ────────────────────────────────────────────── */}
            <div className="col-lg-5">
              <div className="glass-panel p-4 h-100 d-flex flex-column">
                <h4 className="fw-bold mb-1">Join Private</h4>
                <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Enter a lobby code to join a friend.</p>

                <form onSubmit={handleJoinByCode} className="mt-auto">
                  <div className="bg-light p-4 rounded-4 mb-3 text-center border">
                    <input type="text" className="border-0 bg-transparent text-center w-100"
                      placeholder="— — — — — —" value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6}
                      style={{ fontFamily: 'monospace', letterSpacing: '8px', fontSize: '1.8rem', fontWeight: 800, color: '#007AFF', outline: 'none' }} />
                    <div className="text-muted mt-2 fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>6-DIGIT LOBBY CODE</div>
                  </div>
                  <button type="submit" className="apple-btn-primary py-3">
                    <LogIn size={20} className="me-2" /> Join Match
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* ── LOBBY LIST ───────────────────────────────────────────────────── */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Users size={20} className="text-primary" />
                Open Lobbies
                <span className="badge rounded-pill bg-light text-dark border fw-normal" style={{ fontSize: '0.7rem' }}>{matches.length} AVAILABLE</span>
              </h5>
              <button onClick={fetchMatches} className="btn btn-sm btn-light rounded-pill border px-3 d-flex align-items-center gap-2">
                <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary opacity-50" />
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-panel p-5 text-center text-muted border-dashed border-2">
                <div className="mb-3 opacity-25"><Target size={48} /></div>
                <p className="mb-0 fw-medium">No open matches found.</p>
                <p className="small">Be the first to create a match!</p>
              </div>
            ) : (
              <div className="row g-3">
                {matches.map(m => {
                  const name = m.game_state?.lobby_name || `${m.user_profiles?.username}'s Match`;
                  const mode = m.game_state?.game_mode || 'Normal';
                  const hostRating = m.user_profiles?.command_rating || 0;
                  const hostTier = getRankTier(hostRating);

                  return (
                    <div key={m.id} className="col-md-6 col-xl-4">
                      <div className="glass-panel p-4 lobby-card-float transition-all border-hover-primary" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge rounded-pill" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', fontSize: '0.65rem' }}>OPEN</span>
                            <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.65rem' }}>{mode.toUpperCase()}</span>
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h6 className="fw-bold mb-1 text-truncate" title={name}>{name}</h6>
                        <div className="d-flex align-items-center gap-2 mb-4">
                          <div className="rounded-circle overflow-hidden border shadow-inner" style={{ width: 28, height: 28, background: '#fff' }}>
                            <img src={`https://api.dicebear.com/7.x/${m.user_profiles?.avatar_style || 'notionists'}/svg?seed=${m.user_profiles?.avatar_seed || m.user_profiles?.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                          </div>
                          <div className="rounded-1 overflow-hidden shadow-sm" style={{ width: 24, height: 24, background: '#fff' }}>
                            <img src={hostTier.icon} alt="Rank" style={{ width: '100%', height: '100%' }} />
                          </div>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{m.user_profiles?.username} ({formatRR(hostRating)} RR)</span>
                        </div>

                        <button onClick={() => handleJoinPublic(m.id, m.host_id)}
                          className={`w-100 py-2 rounded-3 fw-bold transition-all ${m.host_id === user.id ? 'btn btn-outline-primary' : 'apple-btn-primary'}`}
                          style={{ fontSize: '0.85rem' }}>
                          {m.host_id === user.id ? '↩ Rejoin Match' : 'Join Match'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CREATE LOBBY MODAL ────────────────────────────────────────────── */}
        {showModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div className="glass-panel p-4 shadow-2xl border-0 animate-fade-in" style={{ width: '100%', maxWidth: 460 }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Create Match</h4>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Lobby Name</label>
                  <input type="text" className="apple-input py-3"
                    value={lobbyName} onChange={e => setLobbyName(e.target.value)}
                    placeholder="e.g. Pro Lobby" required autoFocus />
                </div>

                <div className="mb-4">
                  <label className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Privacy</label>
                  <div className="d-flex gap-2">
                    <div onClick={() => setPrivacy('public')}
                      className={`flex-grow-1 p-3 rounded-4 border-2 cursor-pointer transition-all ${privacy === 'public' ? 'border-primary bg-primary bg-opacity-10 text-primary' : 'border-light bg-light text-muted'}`}
                      style={{ border: '2px solid transparent' }}>
                      <Globe size={18} className="mb-1" />
                      <div className="fw-bold small">Public</div>
                    </div>
                    <div onClick={() => setPrivacy('private')}
                      className={`flex-grow-1 p-3 rounded-4 border-2 cursor-pointer transition-all ${privacy === 'private' ? 'border-primary bg-primary bg-opacity-10 text-primary' : 'border-light bg-light text-muted'}`}
                      style={{ border: '2px solid transparent' }}>
                      <Lock size={18} className="mb-1" />
                      <div className="fw-bold small">Private</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-5">
                  <button type="button" className="btn btn-light rounded-pill px-4 flex-grow-1 py-2 fw-bold border" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="apple-btn-primary flex-grow-1 py-2" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Match'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
        .border-hover-primary:hover { border-color: #007AFF !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}} />
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
