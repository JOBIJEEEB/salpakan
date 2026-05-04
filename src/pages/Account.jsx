import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getRankTier, formatRR } from '../lib/rankUtils';
import { User, Settings, History, Trophy, TrendingUp, ChevronRight, Edit2, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';
import VersionBadge from '../components/VersionBadge';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass-panel p-3 d-flex align-items-center gap-3">
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>{label}</div>
        <div className="fw-bold" style={{ fontSize: '1.2rem' }}>{value}</div>
      </div>
    </div>
  );
}

function MatchItem({ match, userId }) {
  const isHost = match.host_id === userId;
  const opponent = isHost ? match.guest_profiles?.username : match.host_profiles?.username;
  const finalWinner = match.winner || match.game_state?.winner;
  const winnerId = match.winner_id || match.game_state?.winner_id;
  let gs = match.game_state;
  if (typeof gs === 'string') {
    try { gs = JSON.parse(gs); } catch (e) { gs = {}; }
  }
  if (!gs) gs = {};
  
  const rrChange = isHost ? gs.host_rr_change : gs.guest_rr_change;

  const isWinner = winnerId === userId;
  const isDraw = (!winnerId && (match.status === 'completed' || match.game_state?.winner === 'tie'));
  const isCancelled = match.status === 'cancelled';

  const date = new Date(match.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const resultColor = isCancelled ? '#86868B' : isDraw ? '#AF52DE' : isWinner ? '#34C759' : '#FF3B30';
  const resultText = isCancelled ? 'CANCELLED' : isDraw ? 'DRAW' : isWinner ? 'VICTORY' : 'DEFEAT';

  return (
    <div className="d-flex align-items-center gap-3 p-3 transition-all hover-bg-light" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ width: 4, height: 32, borderRadius: 2, background: resultColor }} />
      <div style={{ flex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div className="fw-bold" style={{ fontSize: '0.95rem' }}>vs {opponent || 'Practice Partner'}</div>
          <div className="d-flex align-items-center gap-2">
            {(rrChange != null) && (
              <span className="badge rounded-pill" style={{ 
                background: `${Number(rrChange) >= 0 ? '#34C759' : '#FF3B30'}15`, 
                color: Number(rrChange) >= 0 ? '#34C759' : '#FF3B30',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '4px 8px',
                border: `1px solid ${Number(rrChange) >= 0 ? '#34C759' : '#FF3B30'}30`
              }}>
                {Number(rrChange) >= 0 ? '+' : ''}{rrChange} RR
              </span>
            )}
            <div className="fw-bold" style={{ fontSize: '0.75rem', color: resultColor }}>{resultText}</div>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.7rem' }}>
          <span>{match.game_state?.game_mode || 'Normal'} Match</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);

  // Avatar Customization State
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState('big-ears-neutral');
  const [avatarSeed, setAvatarSeed] = useState('');

  const tier = profile ? getRankTier(profile.command_rating) : null;
  const winRate = (profile?.wins + profile?.losses) > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) : 0;

  useEffect(() => {
    if (!user) return;
    setNewUsername(profile?.username || '');

    // Check for unsaved changes first
    const saved = localStorage.getItem(`unsaved_avatar_${user.id}`);
    if (saved) {
      try {
        const { avatarStyle: s, avatarSeed: se } = JSON.parse(saved);
        setAvatarStyle(s || profile?.avatar_style || 'big-ears-neutral');
        setAvatarSeed(se || profile?.avatar_seed || profile?.username || '');
      } catch (e) {
        setAvatarStyle(profile?.avatar_style || 'big-ears-neutral');
        setAvatarSeed(profile?.avatar_seed || profile?.username || '');
      }
    } else {
      setAvatarStyle(profile?.avatar_style || 'big-ears-neutral');
      setAvatarSeed(profile?.avatar_seed || profile?.username || '');
    }

    supabase
      .from('matches')
      .select('*, host_profiles:user_profiles!matches_host_id_fkey(username), guest_profiles:user_profiles!matches_guest_id_fkey(username)')
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .not('guest_id', 'is', null) // Exclude practice/solo matches
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setMatches(data || []);
        setLoading(false);
      });
  }, [user, profile]);

  // Persist unsaved changes
  useEffect(() => {
    if (user?.id && showAvatarEditor) {
      localStorage.setItem(`unsaved_avatar_${user.id}`, JSON.stringify({ avatarStyle, avatarSeed }));
    }
  }, [avatarStyle, avatarSeed, showAvatarEditor, user?.id]);

  const FEATURED_SEEDS = [
    'Felix', 'Aneka', 'Vivian', 'Casper', 'Sasha', 'Leo',
    'Milo', 'Cleo', 'Jasper', 'Bella', 'Luna', 'Oliver',
    'Jack', 'Daisy', 'Mochi', 'Coco', 'Shadow', 'Ginger',
    'Pepper', 'Ruby', 'Bear', 'Toby', 'Lucky', 'Simba'
  ];

  const handleAvatarSave = async (specificSeed = null) => {
    const newSeed = specificSeed || avatarSeed;
    setSaving(true);
    try {
      await updateProfile({ avatar_style: avatarStyle, avatar_seed: newSeed });
      localStorage.removeItem(`unsaved_avatar_${user.id}`);
      setShowAvatarEditor(false);
      Swal.fire({
        title: 'Ang galing!',
        text: 'Your new avatar has been saved.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
    setSaving(false);
  };

  const handleRename = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === profile?.username) {
      setIsEditing(false);
      return;
    }

    if (trimmed.length < 3) {
      Swal.fire('Too short', 'Username must be at least 3 characters.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ username: trimmed });
      setIsEditing(false);
      Swal.fire({
        title: 'Updated',
        text: 'Your username has been changed.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      if (error.code === '23505') Swal.fire('Error', 'Username already taken.', 'error');
      else Swal.fire('Error', error.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="page-container fit-screen">
      <div className="flex-grow-1 overflow-auto py-5 px-3">
        <div className="container" style={{ maxWidth: 800 }}>

          {/* Header Section */}
          <div className="glass-panel p-4 mb-4 position-relative overflow-hidden">
            <div className="position-relative z-1 d-flex flex-column flex-md-row align-items-center gap-4">
              <div className="position-relative">
                <div className="rounded-circle overflow-hidden shadow-sm border border-white border-4"
                  style={{ width: 120, height: 120, background: '#fff' }}>
                  <img
                    src={`https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <button className="btn btn-primary rounded-circle p-0 position-absolute bottom-0 end-0 border-white border-2"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setShowAvatarEditor(!showAvatarEditor)}>
                  <Settings size={16} />
                </button>
              </div>

              <div className="text-center text-md-start flex-grow-1">
                <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
                  {isEditing ? (
                    <div className="d-flex gap-2">
                      <input
                        className="apple-input py-1 px-3"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        autoFocus
                        style={{ fontSize: '1.5rem', fontWeight: 700, width: 200 }}
                      />
                      <button className="btn btn-primary rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: 36, height: 36 }} onClick={handleRename} disabled={saving}>
                        <Check size={18} />
                      </button>
                      <button className="btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center border"
                        style={{ width: 36, height: 36 }} onClick={() => { setIsEditing(false); setNewUsername(profile?.username); }}>
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="fw-bold mb-0" style={{ letterSpacing: '-1px' }}>{profile?.username}</h2>
                      <button className="btn btn-link p-0 text-muted" onClick={() => setIsEditing(true)}>
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2">
                  <span className="badge rounded-pill px-3 py-1" style={{ background: `${tier?.color}15`, color: tier?.color, fontWeight: 700, fontSize: '0.7rem' }}>
                    {tier?.name.toUpperCase()}
                  </span>
                  <span className="text-muted small fw-bold">{formatRR(profile?.command_rating)} RR</span>
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.09, pointerEvents: 'none' }}>
              <User size={300} />
            </div>
          </div>

          {/* Avatar Editor */}
          {showAvatarEditor && (
            <div className="glass-panel p-4 mb-4 border-primary shadow-lg" style={{ border: '1px solid var(--system-blue)' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold mb-0">Personalize Avatar</h5>
                <button className="btn btn-sm btn-light border rounded-pill px-3" onClick={() => handleAvatarSave()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Selection'}
                </button>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-12">
                  <label className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Pick a Style</label>
                </div>
                {[
                  { id: 'big-ears-neutral', label: 'Big Ears' },
                  { id: 'avataaars', label: 'Modern' },
                  { id: 'pixel-art', label: 'Pixel' },
                  { id: 'toon-head', label: 'Toon Head' },
                  { id: 'micah', label: 'Minimal' },
                  { id: 'lorelei', label: 'Anime' },
                ].map(s => (
                  <div key={s.id} className="col-4 col-md-2">
                    <button
                      className={`w-100 py-2 rounded-3 border transition-all ${avatarStyle === s.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-muted border-light'}`}
                      style={{ fontSize: '0.7rem', fontWeight: 600 }}
                      onClick={() => {
                        setAvatarStyle(s.id);
                        // Reset seed selection when switching styles to avoid confusion
                        if (avatarSeed !== profile?.avatar_seed) setAvatarSeed('');
                      }}>
                      {s.label}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <label className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>All Featured Icons</label>
                  <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.6rem' }}>{FEATURED_SEEDS.length} AVAILABLE</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', paddingBottom: '10px' }} className="no-scrollbar">
                  <div className="row g-2">
                    {FEATURED_SEEDS.map(seed => (
                      <div key={seed} className="col-3 col-md-2">
                        <div
                          className={`avatar-selection-card rounded-4 overflow-hidden cursor-pointer position-relative ${avatarSeed === seed ? 'selected' : ''}`}
                          onClick={() => setAvatarSeed(seed)}>
                          <img
                            src={`https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                            alt={seed}
                            style={{ width: '100%', height: '100%' }}
                            loading="lazy"
                          />
                          {avatarSeed === seed && (
                            <div className="position-absolute bottom-0 end-0 p-1 bg-primary text-white rounded-start-3" style={{ fontSize: '0.6rem' }}>
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3">
                <button className="apple-btn-secondary py-2 flex-grow-1" onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}>
                  Random Bullsh*t Go!
                </button>
                <button className="btn btn-outline-secondary py-2 px-4 rounded-pill" onClick={() => {
                  localStorage.removeItem(`unsaved_avatar_${user.id}`);
                  setShowAvatarEditor(false);
                  setAvatarStyle(profile?.avatar_style || 'big-ears-neutral');
                  setAvatarSeed(profile?.avatar_seed || profile?.username);
                }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="row g-4 mb-4">
            <div className="col-sm-6 col-md-3">
              <StatCard label="Win Rate" value={`${winRate}%`} icon={<TrendingUp size={20} />} color="#007AFF" />
            </div>
            <div className="col-sm-6 col-md-3">
              <StatCard label="Wins" value={profile?.wins || 0} icon={<Trophy size={20} />} color="#34C759" />
            </div>
            <div className="col-sm-6 col-md-3">
              <StatCard label="Losses" value={profile?.losses || 0} icon={<X size={20} />} color="#FF3B30" />
            </div>
            <div className="col-sm-6 col-md-3">
              <StatCard label="Rank Rating" value={formatRR(profile?.command_rating)} icon={<TrendingUp size={20} />} color="#AF52DE" />
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-12">
              <div className="glass-panel overflow-hidden border-0 shadow-sm">
                <div className="px-4 py-3 bg-light border-bottom d-flex align-items-center gap-2">
                  <History size={18} className="text-muted" />
                  <span className="fw-bold text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>MATCH HISTORY</span>
                </div>

                <div className="d-flex flex-column">
                  {loading ? (
                    <div className="p-5 text-center"><div className="spinner-border spinner-border-sm text-primary opacity-20" /></div>
                  ) : matches.length === 0 ? (
                    <div className="p-5 text-center text-muted">No matches played yet.</div>
                  ) : (
                    matches.map(m => <MatchItem key={m.id} match={m} userId={user.id} />)
                  )}
                </div>

                {!loading && matches.length > 0 && (
                  <div className="px-4 py-2 bg-light border-top text-center">
                    <span className="text-muted small">Showing last 20 matches</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
        <VersionBadge />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hover-bg-light:hover { background: rgba(0,0,0,0.02); }
        .hover-bg-light { transition: background 0.2s ease; cursor: default; }
        .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
        
        .avatar-selection-card {
          aspect-ratio: 1;
          background: #F5F5F7;
          border: 2px solid transparent;
          transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        .avatar-selection-card:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          background: #fff;
        }
        .avatar-selection-card.selected {
          border-color: var(--system-blue);
          background: #fff;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
          transform: scale(1.02);
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
