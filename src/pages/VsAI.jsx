import React, { useState, useEffect, useRef } from 'react';
import { buildPieceSet, resolveCombat, getValidMoves, ROWS, COLS, PIECE_DEFS } from '../lib/gameConstants';
import Swal from 'sweetalert2';
import GameBoard from '../components/GameBoard';
import ChainOfCommand from '../components/ChainOfCommand';


const STORAGE_KEY = 'salpakan_vsai_state';

const DIFFICULTY = [
  { id: 'recruit', label: '🟢 Recruit', desc: 'Randomly moves and attacks.', delay: 600 },
  { id: 'veteran', label: '🟡 Veteran', desc: 'Prioritizes attacks when possible.', delay: 800 },
  { id: 'general', label: '🔴 General', desc: 'Targets your flag aggressively.', delay: 1000 },
];

function buildEmptyBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

function aiDeploy(board) {
  const next = board.map(r => [...r]);
  const pieces = buildPieceSet('guest');
  let idx = 0;
  for (let r = 0; r <= 2 && idx < pieces.length; r++)
    for (let c = 0; c < COLS && idx < pieces.length; c++)
      if (!next[r][c]) next[r][c] = pieces[idx++];
  return next;
}

function aiPickMove(board, difficulty) {
  const myPieces = [];
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (cell?.owner === 'guest') myPieces.push([r, c]);
  }));
  if (!myPieces.length) return null;

  const attacks = [], moves = [];
  myPieces.forEach(([r, c]) => {
    getValidMoves(board, r, c, 'guest').forEach(([tr, tc]) => {
      (board[tr][tc]?.owner === 'host' ? attacks : moves).push({ from: [r, c], to: [tr, tc] });
    });
  });

  if (difficulty === 'general') {
    const flagAttack = attacks.find(({ to: [tr, tc] }) => board[tr][tc]?.type === 'FLAG');
    if (flagAttack) return flagAttack;
  }
  const pool = difficulty !== 'recruit' && attacks.length ? attacks : [...attacks, ...moves];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function initialState() {
  return { difficulty: null, board: buildEmptyBoard(), phase: 'deployment',
           currentTurn: 'host', battleLog: [], winner: null };
}

const G_ICON = {
  FIVE_STAR:'★★★★★',FOUR_STAR:'★★★★',THREE_STAR:'★★★',TWO_STAR:'★★',ONE_STAR:'★',
  COLONEL:'✦✦✦',LT_COL:'✦✦',MAJOR:'✦',CAPTAIN:'▲▲',FIRST_LT:'▲',SECOND_LT:'△',
  SERGEANT:'≡',CORPORAL:'—',PRIVATE:'^',SPY:'◉',FLAG:'⚑',
};

// ── Graveyard Panel ──────────────────────────────────────────────────────────
function Graveyard({ board, owner, label, accentColor }) {
  const allPieces = buildPieceSet(owner);
  const aliveIds  = new Set(board.flat().filter(c => c?.owner === owner).map(c => c.id));
  const captured  = allPieces.filter(p => !aliveIds.has(p.id)).length;

  return (
    <div className="glass-panel p-3">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, color: accentColor }}>{label}</span>
        <span style={{ fontSize:'0.7rem', color:'#86868B', fontWeight:500 }}>{captured} captured</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:5 }}>
        {allPieces.map(p => {
          const alive = aliveIds.has(p.id);
          return (
            <div key={p.id} title={p.label} style={{
              aspectRatio:'1', borderRadius:8, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', gap:1,
              background: alive ? accentColor : '#E5E5EA',
              opacity: alive ? 1 : 0.25,
              transition:'opacity 0.4s, background 0.4s',
              cursor:'default',
            }}>
              <span style={{ fontSize:'0.75rem', color: alive ? '#fff' : '#8E8E93', lineHeight:1 }}>{G_ICON[p.type]}</span>
              <span style={{ fontSize:'0.38rem', color: alive ? 'rgba(255,255,255,0.7)' : '#8E8E93', lineHeight:1 }}>{p.abbr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Battle Log Panel ─────────────────────────────────────────────────────────
function BattleLog({ log }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  return (
    <div className="glass-panel p-2 d-flex flex-column" style={{ width: 190, alignSelf: 'stretch', maxHeight: 420, minHeight: 120 }}>
      <div className="fw-semibold mb-2" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Log</div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {log.length === 0
          ? <div className="text-muted" style={{ fontSize: '0.72rem' }}>No battles yet…</div>
          : log.map((entry, i) => (
            <div key={i} style={{
              fontSize: '0.72rem', lineHeight: 1.35, padding: '4px 6px', borderRadius: 6,
              background: entry.startsWith('🔵') ? 'rgba(0,122,255,0.07)'
                        : entry.startsWith('🔴') ? 'rgba(255,59,48,0.07)'
                        : 'rgba(0,0,0,0.04)',
            }}>
              {entry}
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function VsAI() {
  const [state, setState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return initialState();
      const parsed = JSON.parse(s);
      // Validate required shape — wipe stale saves from old builds
      if (!parsed.board || !Array.isArray(parsed.board) || parsed.board.length !== ROWS) {
        localStorage.removeItem(STORAGE_KEY);
        return initialState();
      }
      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return initialState();
    }
  });

  const { difficulty, board, phase, currentTurn, battleLog, winner } = state;
  const [aiLastMove, setAiLastMove] = useState(null);
  const [logOpen, setLogOpen]       = useState(false);
  const aiRunRef = useRef(false);

  const update = patch => setState(s => ({ ...s, ...patch }));

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  // SweetAlert2 victory / defeat modal
  useEffect(() => {
    if (!winner) return;
    const isWin = winner === 'host';
    // Build enemy piece reveal grid
    const ICON = { FIVE_STAR:'★★★★★',FOUR_STAR:'★★★★',THREE_STAR:'★★★',TWO_STAR:'★★',ONE_STAR:'★',
      COLONEL:'✦✦✦',LT_COL:'✦✦',MAJOR:'✦',CAPTAIN:'▲▲',FIRST_LT:'▲',SECOND_LT:'△',
      SERGEANT:'≡',CORPORAL:'—',PRIVATE:'^',SPY:'◉',FLAG:'⚑' };
    const enemyPieces = board.flat().filter(c => c?.owner === 'guest');
    const pieceTiles = enemyPieces.map(p =>
      `<span title="${p.label}" style="display:inline-flex;flex-direction:column;align-items:center;
        justify-content:center;width:40px;height:40px;border-radius:8px;background:#FF3B30;
        color:#fff;font-size:0.85rem;margin:2px;">
        <span>${ICON[p.type]}</span>
        <span style="font-size:0.32rem;opacity:0.85">${p.abbr}</span>
      </span>`
    ).join('');
    const html = `
      <p style="font-size:0.9rem;margin-bottom:12px">${isWin ? 'You outmaneuvered the AI. Excellent command!' : 'The AI captured your flag. Regroup and try again.'}</p>
      <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#86868B;margin-bottom:6px">
        Enemy Pieces Revealed (${enemyPieces.length} remaining)
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">${pieceTiles}</div>
    `;
    Swal.fire({
      title: isWin ? '🏆 Victory!' : '💀 Defeated!',
      html,
      icon: isWin ? 'success' : 'error',
      confirmButtonText: '🔄 Play Again',
      showCancelButton: true,
      cancelButtonText: 'Close',
      confirmButtonColor: isWin ? '#34C759' : '#007AFF',
      cancelButtonColor: '#8E8E93',
      width: 480,
    }).then(result => { if (result.isConfirmed) reset(difficulty); });
  }, [winner]);

  const reset = diff => {
    const fresh = { ...initialState(), difficulty: diff };
    setState(fresh);
    setAiLastMove(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  const handlePhaseChange = newPhase => {
    if (newPhase === 'battle') update({ board: aiDeploy(board), phase: 'battle' });
    else update({ phase: newPhase });
  };

  // ── AI Turn ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || currentTurn !== 'guest' || winner || aiRunRef.current) return;
    aiRunRef.current = true;
    const diff = DIFFICULTY.find(d => d.id === difficulty);
    const timer = setTimeout(() => {
      const move = aiPickMove(board, difficulty);
      if (!move) { update({ winner: 'host' }); aiRunRef.current = false; return; }

      const { from: [sr, sc], to: [tr, tc] } = move;
      const next = board.map(r => [...r]);
      const mover = next[sr][sc], target = next[tr][tc];
      let log = '';

      if (!target) {
        next[tr][tc] = mover; next[sr][sc] = null;
        log = `🔴 An enemy piece advanced to ${String.fromCharCode(65+tc)}${8-tr}.`;
      } else {
        const result = resolveCombat(mover.type, target.type);
        if (result === 'attacker') {
          next[tr][tc] = mover; next[sr][sc] = null;
          log = `🔴 Your ${target.abbr} at ${String.fromCharCode(65+tc)}${8-tr} was defeated.`;
          if (target.type === 'FLAG') { setAiLastMove({ from:[sr,sc], to:[tr,tc] }); update({ board:next, currentTurn:'host', battleLog:[...battleLog,log], winner:'guest' }); aiRunRef.current=false; return; }
        } else if (result === 'defender') {
          next[sr][sc] = null;
          log = `🔵 Your ${target.abbr} repelled an unknown enemy at ${String.fromCharCode(65+tc)}${8-tr}!`;
        } else {
          next[sr][sc] = null; next[tr][tc] = null;
          log = `💥 Tie at ${String.fromCharCode(65+tc)}${8-tr}.`;
        }
      }

      setAiLastMove({ from:[sr,sc], to:[tr,tc] });
      update({ board:next, currentTurn:'host', battleLog:[...battleLog, log] });
      aiRunRef.current = false;
    }, diff?.delay ?? 700);
    return () => { clearTimeout(timer); aiRunRef.current = false; };
  }, [phase, currentTurn, winner, board, difficulty]);

  // ── Difficulty screen ──────────────────────────────────────────────────
  if (!difficulty) return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="glass-panel p-5 text-center mt-4">
            <h2 className="fw-bold mb-2">VS AI</h2>
            <p className="text-muted mb-4">Choose your opponent's difficulty</p>
            <div className="d-flex flex-column gap-3">
              {DIFFICULTY.map(d => (
                <button key={d.id} onClick={() => reset(d.id)}
                  className="apple-btn-secondary text-start d-flex align-items-center gap-3"
                  style={{ padding: '16px 20px' }}>
                  <div>
                    <div className="fw-semibold">{d.label}</div>
                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>{d.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ChainOfCommand />
    </div>
  );

  // ── Game screen ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0.75rem 1.25rem' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-1">
        <div>
          <h6 className="fw-bold mb-0">{DIFFICULTY.find(d => d.id === difficulty)?.label} — VS AI</h6>
          {aiRunRef.current && <small className="text-muted" style={{ fontSize: '0.72rem' }}>AI is thinking…</small>}

        </div>
        <button onClick={() => reset(null)} className="btn btn-outline-secondary btn-sm rounded-pill" style={{ fontSize: '0.75rem', padding: '2px 12px' }}>
          ← Difficulty
        </button>
      </div>

      {winner && (
        <div className={`alert ${winner === 'host' ? 'alert-success' : 'alert-danger'} rounded-3 text-center py-2 mb-2`} style={{ fontSize: '0.85rem' }}>
          {winner === 'host' ? '🏆 You Won!' : '💀 Defeated.'}
          <button onClick={() => reset(difficulty)} className="btn btn-sm btn-link ms-2">Rematch</button>
        </div>
      )}

      {/* ── 3-Column layout: Board | Graveyard — centered */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'center' }}>

        {/* Left: Battle Log sidebar (slide-in) */}
        {phase === 'battle' && logOpen && <BattleLog log={battleLog} onClose={() => setLogOpen(false)} />}

        {/* Center: Board */}
        <div style={{ flex: '0 0 auto' }}>
          <GameBoard
            board={board}        setBoard={b => update({ board: b })}
            phase={phase}        setPhase={handlePhaseChange}
            currentTurn={currentTurn} setCurrentTurn={t => update({ currentTurn: t })}
            playerRole="host"
            battleLog={battleLog} setBattleLog={l => update({ battleLog: typeof l === 'function' ? l(battleLog) : l })}
            winner={winner}      setWinner={w => update({ winner: w })}
            isAI={true}
            aiLastMove={aiLastMove}
          />
        </div>

        {/* Right: Compact Graveyard */}
        {phase === 'battle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 120 }}>
            <Graveyard board={board} owner="host"  label="Yours"  accentColor="#007AFF" />
            <Graveyard board={board} owner="guest" label="Enemy"  accentColor="#FF3B30" />
          </div>
        )}
      </div>

      {/* Floating Battle Log button */}
      {phase === 'battle' && (
        <button onClick={() => setLogOpen(v => !v)} title="Battle Log"
          style={{ position:'fixed', bottom:'2rem', right:'5.5rem', zIndex:1100,
                   width:48, height:48, borderRadius:'50%',
                   background: logOpen ? '#34C759' : '#636366', color:'#fff',
                   border:'none', fontSize:'1.1rem', fontWeight:700,
                   boxShadow:'0 4px 16px rgba(0,0,0,0.2)', cursor:'pointer',
                   transition:'background 0.2s, transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          📋
        </button>
      )}
      <ChainOfCommand />
    </div>
  );
}
