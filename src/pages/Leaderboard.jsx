import React, { useState, useEffect } from 'react';
import { getRankTier, getNextTier, getProgressToNext, formatRR, RANK_TIERS } from '../lib/rankUtils';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

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
    <div className="d-flex align-items-center gap-3 px-3 py-2 transition-all hover-bg-light" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
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
      .select('id, username, command_rating, wins, losses, draws, avatar_style, avatar_seed')
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
      <div className="flex-grow-1 overflow-auto py-4 px-3">
        <div className="container" style={{ maxWidth: 700 }}>
          <div className="d-flex justify-content-between align-items-center mt-4 mb-4">
            <div>
              <h1 className="fw-bold mb-1" style={{ letterSpacing: '-1.5px' }}>Rankings</h1>
              <p className="text-muted mb-0 small">Global Player Hierarchy</p>
            </div>
            <button 
              onClick={() => setShowInfo(true)}
              className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center" 
              style={{ width: 40, height: 40, background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <span className="fw-bold" style={{ color: '#86868B' }}>?</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary opacity-20" />
            </div>
          ) : (
            <div className="glass-panel overflow-hidden border-0 shadow-sm" style={{ background: '#fff' }}>
              <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center gap-3 text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                <div style={{ width: 40, textAlign: 'center' }}>RANK</div>
                <div style={{ width: 40, textAlign: 'center' }}>TIER</div>
                <div style={{ flex: 1 }}>PLAYER</div>
                <div className="text-end" style={{ minWidth: 100 }}>RATING / WR</div>
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
          
          <div className="pb-5 mb-5" />
        </div>
      </div>

      <RankInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {myData && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.06)', padding: '0.75rem 1.5rem',
        }}>
          <div className="d-flex align-items-center gap-3" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="rounded-2 overflow-hidden shadow-sm" style={{ width: 36, height: 36, background: '#fff' }}>
              <img src={myTier?.icon} alt="Rank" style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-semibold small">{profile?.username} · {myTier?.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#86868B', fontWeight: 600 }}>
                  {formatRR(myData.command_rating)} RR {nextTier ? `→ ${nextTier.min}` : ''}
                </span>
              </div>
              <div style={{ background: '#E5E5EA', borderRadius: 999, height: 4 }}>
                <div style={{ width: `${progress}%`, height: 4, borderRadius: 999, background: myTier?.color, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div className="fw-bold" style={{ color: '#86868B', minWidth: 40, textAlign: 'right' }}>#{myRank}</div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-bg-light:hover { background: rgba(0,0,0,0.02); }
        .hover-bg-light { transition: background 0.2s ease; cursor: default; }
      `}} />
    </div>
  );
}
