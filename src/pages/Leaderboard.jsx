import React, { useState, useEffect } from 'react';
import { getRankTier, getNextTier, getProgressToNext, formatRR, RANK_TIERS } from '../lib/rankUtils';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { showPlayerProfile } from '../lib/profileUtils';

function RankInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000,
      background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-panel p-4 shadow-2xl border-0 animate-fade-in" style={{ width: '100%', maxWidth: 480 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">Power Hierarchy</h4>
          <button className="btn-close" onClick={onClose}></button>
        </div>
        <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '70vh' }}>
          {[...RANK_TIERS].reverse().map(tier => (
            <div key={tier.name} className="d-flex align-items-center gap-3 p-3 rounded-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)' }}>
              <div className="rounded-3 overflow-hidden shadow-sm" style={{ width: 44, height: 44, background: '#fff' }}>
                <img src={tier.icon} alt={tier.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="flex-grow-1">
                <div className="fw-bold" style={{ color: tier.color }}>{tier.name}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{tier.min}{tier.max === Infinity ? '+' : ` - ${tier.max}`} RR</div>
              </div>
            </div>
          ))}
        </div>
        <button className="apple-btn-primary mt-4 py-2" style={{ width: '100%' }} onClick={onClose}>Understood</button>
      </div>
    </div>
  );
}

function PlayerRow({ rank, player }) {
  const tier = getRankTier(player.command_rating);
  const winRate = (player.wins + player.losses) > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100) : 0;

  return (
    <div 
      className="d-flex align-items-center gap-3 px-3 py-2 transition-all hover-bg-light cursor-pointer" 
      onClick={() => showPlayerProfile(player)}
      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
    >
      <div style={{ width: 40, textAlign: 'center', color: '#86868B', fontWeight: 700, fontSize: '0.9rem' }}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </div>
      {/* TIER ICON first to match header */}
      <div className="rounded-2 overflow-hidden shadow-sm" style={{ width: 32, height: 32, background: '#fff' }}>
        <img src={tier.icon} alt={tier.name} style={{ width: '100%', height: '100%' }} />
      </div>
      {/* PLAYER AVATAR second */}
      <div className="rounded-circle overflow-hidden shadow-inner border" style={{ width: 32, height: 32, background: '#fff' }}>
        <img src={`https://api.dicebear.com/7.x/${player.avatar_style || 'notionists'}/svg?seed=${player.avatar_seed || player.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>{player.username}</div>
        <div style={{ fontSize: '0.72rem', color: tier.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tier.name}</div>
      </div>
      <div className="text-end" style={{ minWidth: 100 }}>
        <div className="fw-bold" style={{ color: 'var(--system-blue)', fontSize: '1rem' }}>{formatRR(player.command_rating)}</div>
        <div style={{ fontSize: '0.68rem', color: '#86868B', fontWeight: 600 }}>{player.wins}W {player.losses}L · {winRate}% WR</div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, username, command_rating, wins, losses, draws, avatar_style, avatar_seed, created_at')
      .order('command_rating', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const list = data || [];
        setPlayers(list);
        const idx = list.findIndex((p) => p.id === user?.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
        setLoading(false);
      });
  }, [user]);

  const myData = players.find((p) => p.id === user?.id);
  const myTier = myData ? getRankTier(myData.command_rating) : null;
  const nextTier = myData ? getNextTier(myData.command_rating) : null;
  const progress = myData ? getProgressToNext(myData.command_rating) : 0;

  return (
    <div className="page-container fit-screen">
      <div className="flex-grow-1 overflow-auto p-0 m-0 no-scrollbar">
        {/* ── RANKINGS HEADER ────────────────────────────────────────── */}
        <div className="dashboard-header-premium mb-4 pb-5">
          <div className="dashboard-mesh-bg" />

          <div className="container position-relative z-1 py-4 py-lg-5">
            <div className="text-center animate-slide-in">
              <h1 className="display-5 fw-bold mb-1 header-gradient-text" style={{ letterSpacing: '-2px' }}>
                Global Rankings
              </h1>
              <p className="text-muted fw-medium small mb-4">The elite hierarchy of Salpakan commanders.</p>

              {myData && (
                <div className="mx-auto mt-4 animate-fade-in-delayed" style={{ maxWidth: 600 }}>
                  <div className="glass-panel hero-rank-module p-3 d-flex align-items-center gap-3"
                    style={{ textAlign: 'left' }}>
                    <div className="rounded-3 overflow-hidden shadow-sm" style={{ width: 44, height: 44, background: '#fff', border: '1px solid #000' }}>
                      <img src={myTier?.icon} alt="Rank" style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-black text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                          {profile?.username} · <span style={{ color: myTier?.color }}>{myTier?.name}</span>
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#007AFF', fontWeight: 800 }}>
                          {formatRR(myData.command_rating)} RR {nextTier ? `→ ${nextTier.min}` : ''}
                        </span>
                      </div>
                      <div style={{ background: '#F2F2F7', borderRadius: 999, height: 8, border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${myTier?.color || '#007AFF'} 0%, #007AFF 100%)`,
                          transition: 'width 1.5s cubic-bezier(0.165, 0.84, 0.44, 1)'
                        }} />
                      </div>
                    </div>
                    <div className="d-flex flex-column align-items-center justify-content-center px-3 border-start">
                      <div className="text-muted fw-bold" style={{ fontSize: '0.6rem' }}>RANK</div>
                      <div className="fw-black" style={{ fontSize: '1.2rem', lineHeight: 1 }}>#{myRank}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container pb-5">
          <div className="row g-4">
            {/* ── LEADERBOARD (80%) ────────────────────────────────────── */}
            <div className="col-lg-9">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-black text-uppercase mb-0" style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#86868B' }}>Top Commanders</h6>
                <div className="badge rounded-pill bg-light text-dark border px-3" style={{ fontSize: '0.65rem' }}>{players.length} ACTIVE</div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary opacity-20" />
                </div>
              ) : (
                <div className="glass-panel overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 bg-light border-bottom d-flex align-items-center gap-3 text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1.5px' }}>
                    <div style={{ width: 40, textAlign: 'center' }}>RANK</div>
                    <div style={{ width: 40, textAlign: 'center' }}>TIER</div>
                    <div style={{ flex: 1 }}>PLAYER</div>
                    <div className="text-end" style={{ minWidth: 120 }}>RATING / PERFORMANCE</div>
                  </div>
                  <div className="d-flex flex-column">
                    {players.map((p, i) => (
                      <PlayerRow key={p.id} rank={i + 1} player={p} />
                    ))}
                    {players.length === 0 && (
                      <div className="p-5 text-center text-muted">No players ranked yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── RANK HIERARCHY (20%) ─────────────────────────────────── */}
            <div className="col-lg-3">
              <h6 className="fw-black text-uppercase mb-3" style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#86868B' }}>Rank Hierarchy</h6>
              <div className="d-flex flex-column gap-2">
                {[...RANK_TIERS].reverse().map(tier => (
                  <div key={tier.name} className="glass-panel p-2 d-flex align-items-center gap-3 transition-all hover-lift" style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                    <div className="rounded-2 overflow-hidden shadow-sm" style={{ width: 32, height: 32, background: '#fff', flexShrink: 0 }}>
                      <img src={tier.icon} alt={tier.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-bold text-truncate" style={{ color: tier.color, fontSize: '0.75rem' }}>{tier.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.65rem' }}>{tier.min}{tier.max === Infinity ? '+' : ` - ${tier.max}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pb-5 mb-5" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hover-bg-light:hover { background: rgba(0,122,255,0.02); }
        .hover-bg-light { transition: background 0.3s ease; cursor: default; }
      `}} />
    </div>
  );
}
