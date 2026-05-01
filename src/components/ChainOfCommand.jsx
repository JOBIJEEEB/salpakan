import React, { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { PIECE_DEFS } from '../lib/gameConstants';

export default function ChainOfCommand({ onClose }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (onClose && open) onClose();
    setOpen((v) => !v);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={toggle}
        title="Chain of Command"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1100,
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--system-blue)', color: '#fff',
          border: 'none', fontSize: '1.1rem', fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,122,255,0.4)',
          cursor: 'pointer', transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        ⚔
      </button>

      {/* Slide-in drawer */}
      <div style={{
        position: 'fixed', top: 0, right: open ? 0 : '-420px',
        width: 400, height: '100vh', zIndex: 1200,
        transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          flex: 1, overflowY: 'auto', margin: '1rem',
          borderRadius: 20, padding: '1.5rem',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(30px)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        }}>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="fw-bold mb-0" style={{ letterSpacing: '-0.5px' }}>Chain of Command</h5>
              <small className="text-muted">Higher rank defeats lower rank</small>
            </div>
            <button onClick={toggle} className="btn btn-link p-0 text-muted">
              <X size={20} />
            </button>
          </div>

          {/* Special rules callout */}
          <div style={{ background: 'rgba(0,122,255,0.08)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <div className="fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>⚠ Special Rules</div>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444' }}>
              <b>Spy</b> defeats <i>all officers</i> (5★ down to Corporal) — but <b>Private defeats Spy</b>.<br />
              <b>Flag</b> is captured by any piece, including another Flag.<br />
              <b>Tie</b> — same rank: both pieces are destroyed.
            </div>
          </div>

          {/* Rank table */}
          <table className="w-100" style={{ fontSize: '0.82rem', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
            <thead>
              <tr>
                <th style={{ color: '#86868B', fontWeight: 500, paddingBottom: '0.5rem' }}>Rank</th>
                <th style={{ color: '#86868B', fontWeight: 500 }}>Piece</th>
                <th style={{ color: '#86868B', fontWeight: 500 }}>Abbr</th>
                <th style={{ color: '#86868B', fontWeight: 500, textAlign: 'right' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {PIECE_DEFS.map((p, i) => (
                <tr key={p.type}>
                  <td style={{ color: 'var(--system-blue)', fontWeight: 700, width: 32, fontSize: '0.78rem' }}>
                    {p.type === 'FLAG' || p.type === 'SPY' ? '—' : i + 1}
                  </td>
                  <td>
                    <span className="fw-medium">{p.label}</span>
                    {p.type === 'SPY' && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#FF3B30', background: 'rgba(255,59,48,0.1)', borderRadius: 4, padding: '1px 5px' }}>SPECIAL</span>}
                    {p.type === 'PRIVATE' && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#34C759', background: 'rgba(52,199,89,0.1)', borderRadius: 4, padding: '1px 5px' }}>BEATS SPY</span>}
                    {p.type === 'FLAG' && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#FF9500', background: 'rgba(255,149,0,0.1)', borderRadius: 4, padding: '1px 5px' }}>OBJECTIVE</span>}
                  </td>
                  <td style={{ color: 'var(--system-blue)', fontWeight: 600, fontFamily: 'monospace' }}>{p.abbr}</td>
                  <td style={{ textAlign: 'right', color: '#86868B' }}>×{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Win conditions */}
          <div style={{ background: 'rgba(52,199,89,0.08)', borderRadius: 12, padding: '0.75rem 1rem', marginTop: '1rem' }}>
            <div className="fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>🏁 Win Conditions</div>
            <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444' }}>
              1. Capture the enemy <b>Flag</b>.<br />
              2. Move your Flag to the opponent's back row and survive one full turn.
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          onClick={toggle}
          style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(0,0,0,0.2)' }}
        />
      )}
    </>
  );
}
