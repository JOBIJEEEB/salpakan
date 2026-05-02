import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildPieceSet, resolveCombat, getValidMoves, ROWS, COLS, PIECE_DEFS } from '../lib/gameConstants';
import Swal from 'sweetalert2';
import GameBoard from '../components/GameBoard';
import { useAuth } from '../context/AuthContext';
import { User, Swords, ShieldAlert, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'salpakan_vsai_state';

const DIFFICULTY_CONFIG = [
  { id: 'recruit', label: 'Marine', icon: <User size={32} />, color: '#8E8E93', desc: 'Standard tactical training. Focuses on basic unit movement and awareness.', delay: 600 },
  { id: 'veteran', label: 'Scout Ranger', icon: <Swords size={32} />, color: '#007AFF', desc: 'Specialized jungle warfare logic. Expect aggressive flanking and calculated trades.', delay: 800 },
  { id: 'general', label: 'SAF Elite', icon: <ShieldAlert size={32} />, color: '#FF3B30', desc: 'Special Action Force level intelligence. Absolute precision in unit protection and capture.', delay: 1000 },
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
  return {
    difficulty: null,
    board: buildEmptyBoard(),
    phase: 'deployment',
    currentTurn: 'host',
    battleLog: [],
    winner: null,
    turn_start_at: null,
  };
}

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (!s) return initialState();
      const parsed = JSON.parse(s);
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
  const aiRunRef = useRef(false);

  const update = patch => setState(s => {
    const next = { ...s, ...patch };
    if (patch.currentTurn && patch.currentTurn !== s.currentTurn) {
      next.turn_start_at = new Date().toISOString();
    }
    if (patch.winner) {
      next.winner_id = patch.winner === 'host' ? user?.id : 'ai';
    }
    return next;
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  useEffect(() => {
    if (!winner) return;
    const isWin = winner === 'host';
    const ICON = {
      FIVE_STAR: '★★★★★', FOUR_STAR: '★★★★', THREE_STAR: '★★★', TWO_STAR: '★★', ONE_STAR: '★',
      COLONEL: '✦✦✦', LT_COL: '✦✦', MAJOR: '✦', CAPTAIN: '▲▲', FIRST_LT: '▲', SECOND_LT: '△',
      SERGEANT: '≡', CORPORAL: '—', PRIVATE: '^', SPY: '◉', FLAG: '⚑'
    };
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
      <p style="font-size:0.9rem;margin-bottom:12px">${isWin
        ? 'You outmaneuvered the AI. Excellent command!'
        : 'The AI captured your flag. Regroup and try again.'}</p>
      <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#86868B;margin-bottom:6px">
        Enemy Pieces Revealed (${enemyPieces.length} remaining)
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">${pieceTiles || '<span style="color:#86868B;font-size:0.8rem">All enemy pieces eliminated!</span>'}</div>
    `;
    Swal.fire({
      title: isWin ? 'Victory' : 'Defeated',
      html,
      icon: isWin ? 'success' : 'error',
      confirmButtonText: 'Play Again',
      showCancelButton: true,
      cancelButtonText: 'Close',
      confirmButtonColor: isWin ? '#34C759' : '#056d94',
      cancelButtonColor: '#8E8E93',
      width: 480,
      customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm', cancelButton: 'apple-swal-cancel' }
    }).then(result => { if (result.isConfirmed) reset(difficulty); });
  }, [winner]);

  const reset = diff => {
    const fresh = { ...initialState(), difficulty: diff };
    setState(fresh);
    setAiLastMove(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  const handlePhaseChange = newPhase => {
    if (newPhase === 'battle') update({ board: aiDeploy(board), phase: 'battle', turn_start_at: new Date().toISOString() });
    else update({ phase: newPhase });
  };

  useEffect(() => {
    if (phase !== 'battle' || currentTurn !== 'guest' || winner || aiRunRef.current) return;
    const diff = DIFFICULTY_CONFIG.find(d => d.id === difficulty);
    const timer = setTimeout(() => {
      const move = aiPickMove(board, difficulty);
      if (!move) { update({ winner: 'host' }); aiRunRef.current = false; return; }

      const { from: [sr, sc], to: [tr, tc] } = move;
      const next = board.map(r => [...r]);
      const mover = next[sr][sc], target = next[tr][tc];
      let log = '';

      if (!target) {
        next[tr][tc] = mover; next[sr][sc] = null;
        log = `GUEST: An enemy piece advanced to ${String.fromCharCode(65 + tc)}${8 - tr}.`;
      } else {
        const result = resolveCombat(mover.type, target.type);
        if (result === 'attacker') {
          next[tr][tc] = mover; next[sr][sc] = null;
          log = `GUEST: Your ${target.abbr} at ${String.fromCharCode(65 + tc)}${8 - tr} was defeated.`;
          if (target.type === 'FLAG') {
            setAiLastMove({ from: [sr, sc], to: [tr, tc] });
            update({ board: next, currentTurn: 'host', battleLog: [...battleLog, log], winner: 'guest' });
            aiRunRef.current = false;
            return;
          }
        } else if (result === 'defender') {
          next[sr][sc] = null;
          log = `HOST: Your ${target.abbr} repelled an unknown enemy at ${String.fromCharCode(65 + tc)}${8 - tr}!`;
        } else {
          next[sr][sc] = null; next[tr][tc] = null;
          log = `TIE: Tie at ${String.fromCharCode(65 + tc)}${8 - tr}.`;
        }
      }

      setAiLastMove({ from: [sr, sc], to: [tr, tc] });
      update({ board: next, currentTurn: 'host', battleLog: [...battleLog, log] });
      aiRunRef.current = false;
    }, diff?.delay ?? 700);
    return () => { clearTimeout(timer); aiRunRef.current = false; };
  }, [phase, currentTurn, winner, board, difficulty]);

  const handleForfeit = async () => {
    if (winner) { navigate('/lobbies', { replace: true }); return; }
    const isStarting = (phase === 'deployment');
    const title = isStarting ? 'Exit Practice?' : 'Forfeit Practice?';
    const text = isStarting ? 'Are you sure you want to stop?' : 'Are you sure you want to forfeit?';

    const confirm = await Swal.fire({
      title, text, icon: 'warning', showCancelButton: true,
      confirmButtonText: isStarting ? 'Yes, exit' : 'Yes, forfeit',
      cancelButtonText: 'Cancel', confirmButtonColor: '#FF3B30', cancelButtonColor: '#86868B',
      customClass: { popup: 'apple-swal', title: 'apple-swal-title', confirmButton: 'apple-swal-confirm', cancelButton: 'apple-swal-cancel' }
    });

    if (confirm.isConfirmed) { reset(null); navigate('/lobbies', { replace: true }); }
  };

  if (!difficulty) {
    return (
      <div className="page-container fit-screen">
        <div className="flex-grow-1 overflow-auto p-0 m-0">
          <div className="dashboard-header-premium mb-4">
            <div className="dashboard-mesh-bg" />
            <div className="container position-relative z-1 py-4 py-lg-5">
              <div className="d-flex justify-content-between align-items-center mt-4 mb-4">
                <button onClick={() => navigate('/lobbies')} className="btn btn-light rounded-pill px-3 py-1 border d-flex align-items-center gap-2" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  ← Back to Lobbies
                </button>
              </div>
              <div className="text-start animate-slide-in">
                <h1 className="display-5 fw-bold mb-1 header-gradient-text" style={{ letterSpacing: '-2px' }}>
                  Practice Mode
                </h1>
                <p className="text-muted fw-medium small mb-0">Sharpen your command skills against tactical AI units.</p>
              </div>
            </div>
          </div>

          <div className="container mt-4 pb-5">
            <div className="row g-4 justify-content-center">
              {DIFFICULTY_CONFIG.map((d, idx) => (
                <div key={d.id} className="col-md-4">
                  <button onClick={() => reset(d.id)}
                    className="glass-panel p-4 text-start w-100 h-100 lobby-card-float transition-all d-flex flex-column gap-3"
                    style={{ border: '1px solid rgba(0,0,0,0.05)', '--delay': `${idx * 0.1}s` }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: `${d.color}10`, color: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {d.icon}
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1">{d.label}</h5>
                      <p className="text-muted small mb-0">{d.desc}</p>
                    </div>
                    <div className="mt-auto pt-3 d-flex align-items-center gap-2 fw-bold text-primary" style={{ fontSize: '0.8rem' }}>
                      Deploy for Training <ChevronRight size={16} />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="battlefield-container overflow-hidden">
      <div className="d-flex flex-column" style={{ height: '100vh', padding: '0.75rem 1.25rem' }}>
        <div className="d-flex align-items-center mb-3 gap-3">
          <button onClick={handleForfeit} className="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-sm" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {winner ? 'Back to Lobbies' : (phase === 'deployment' ? 'Exit Practice' : 'Forfeit Practice')}
          </button>
          <div>
            <h6 className="fw-bold mb-0">{DIFFICULTY_CONFIG.find(d => d.id === difficulty)?.label} — Practice</h6>
            <div style={{ color: '#86868B', fontSize: '0.7rem', visibility: (currentTurn === 'guest' && phase === 'battle' && !winner) ? 'visible' : 'hidden', minHeight: '1.2em' }}>
              Practice Partner is thinking…
            </div>
          </div>
        </div>
        <div className="flex-grow-1 overflow-hidden position-relative glass-panel p-2">
          <div className="h-100 overflow-auto no-scrollbar">
            <GameBoard
              board={board} setBoard={b => update({ board: b })}
              phase={phase} setPhase={handlePhaseChange}
              currentTurn={currentTurn} setCurrentTurn={t => update({ currentTurn: t })}
              playerRole="host"
              battleLog={battleLog} setBattleLog={l => update({ battleLog: typeof l === 'function' ? l(battleLog) : l })}
              winner={winner} setWinner={w => update({ winner: w })}
              isAI={true} aiLastMove={aiLastMove}
              gameMode="Normal" turnStartAt={state.turn_start_at}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
