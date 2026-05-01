import React, { useState, useEffect } from 'react';
import { getRankTier, getNextTier, getProgressToNext, formatCR } from '../lib/rankUtils';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function Podium({ players }) {
  const order = [1, 0, 2]; // silver, gold, bronze
  const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const heights = [80, 110, 60];
  const labels = ['🥈', '🥇', '🥉'];

  return (
    <div className="d-flex justify-content-center align-items-end gap-3 mb-5" style={{ minHeight: 180 }}>
      {order.map((idx, i) => {
        const p = players[idx];
        if (!p) return <div key={i} style={{ width: 120 }} />;
        const tier = getRankTier(p.command_rating);
        return (
          <div key={p.id} className="text-center">
            <div className="fw-bold mb-1">{labels[i]}</div>
            <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{p.username}</div>
            <div style={{ fontSize: '0.75rem', color: tier.color }}>{tier.name}</div>
            <div
              style={{
                width: 110, height: heights[i], background: colors[i],
                borderRadius: '12px 12px 0 0', marginTop: 8,
                boxShadow: `0 0 20px ${colors[i]}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              {formatCR(p.command_rating)} CR
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerRow({ rank, player }) {
  const tier = getRankTier(player.command_rating);
  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100) : 0;

  return (
    <div className="glass-panel px-4 py-3 d-flex align-items-center gap-3">
      <div style={{ width: 32, textAlign: 'center', color: '#86868B', fontWeight: 700 }}>#{rank}</div>
      <div style={{ width: 32, textAlign: 'center', fontSize: '1.1rem' }}>{tier.icon}</div>
      <div style={{ flex: 1 }}>
        <div className="fw-semibold">{player.username}</div>
        <div style={{ fontSize: '0.75rem', color: tier.color }}>{tier.name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="fw-bold" style={{ color: 'var(--system-blue)' }}>{formatCR(player.command_rating)}</div>
        <div style={{ fontSize: '0.75rem', color: '#86868B' }}>{winRate}% WR</div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id, username, command_rating, wins, losses, draws')
      .order('command_rating', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const list = data || [];
        setPlayers(list);
        const idx = list.findIndex((p) => p.id === user?.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
        setLoading(false);
      });
  }, []);

  const myData = players.find((p) => p.id === user?.id);
  const myTier = myData ? getRankTier(myData.command_rating) : null;
  const nextTier = myData ? getNextTier(myData.command_rating) : null;
  const progress = myData ? getProgressToNext(myData.command_rating) : 0;

  return (
    <div className="container py-5" style={{ paddingBottom: '6rem' }}>
      <h1 className="fw-bold mt-4 mb-2" style={{ letterSpacing: '-1px' }}>Leaderboard</h1>
      <p className="text-muted mb-4">Global Command Ratings</p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <>
          {players.length >= 3 && <Podium players={players} />}

          <div className="d-flex flex-column gap-2">
            {players.slice(3).map((p, i) => (
              <PlayerRow key={p.id} rank={i + 4} player={p} />
            ))}
          </div>
        </>
      )}

      {/* Sticky own rank banner */}
      {myData && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.06)', padding: '0.75rem 1.5rem',
        }}>
          <div className="d-flex align-items-center gap-3" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ fontSize: '1.2rem' }}>{myTier?.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-semibold">{profile?.username} — {myTier?.name}</span>
                <span style={{ fontSize: '0.82rem', color: '#86868B' }}>
                  {myData.command_rating} CR {nextTier ? `→ ${nextTier.min} for ${nextTier.name}` : '(Max Tier)'}
                </span>
              </div>
              <div style={{ background: '#E5E5EA', borderRadius: 999, height: 6 }}>
                <div style={{ width: `${progress}%`, height: 6, borderRadius: 999, background: myTier?.color, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div className="fw-bold" style={{ color: '#86868B', minWidth: 40, textAlign: 'right' }}>#{myRank}</div>
          </div>
        </div>
      )}
    </div>
  );
}
