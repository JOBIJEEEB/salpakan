import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import GameBoard from '../components/GameBoard';
import ChainOfCommand from '../components/ChainOfCommand';
import { ROWS, COLS } from '../lib/gameConstants';

export default function ActiveMatch() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [phase, setPhase] = useState('deployment');
  const [currentTurn, setCurrentTurn] = useState('host');
  const [battleLog, setBattleLog] = useState([]);
  const [winner, setWinner] = useState(null);
  const [lobbyCode, setLobbyCode] = useState('');
  const [role, setRole] = useState(null); // 'host' or 'guest'

  useEffect(() => {
    supabase.from('matches').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) { navigate('/lobbies'); return; }
        setMatch(data);
        setLobbyCode(data.lobby_code);
        const r = data.host_id === user.id ? 'host' : 'guest';
        setRole(r);
        if (data.game_state) {
          const gs = data.game_state;
          setBoard(gs.board || board);
          setPhase(gs.phase || 'deployment');
          setCurrentTurn(gs.current_turn || 'host');
          setBattleLog(gs.battle_log || []);
          setWinner(gs.winner || null);
        }
      });

    // Subscribe to match changes (Supabase Realtime syncs opponent moves)
    const channel = supabase
      .channel(`match_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          const gs = payload.new.game_state;
          if (gs) {
            setBoard(gs.board);
            setPhase(gs.phase);
            setCurrentTurn(gs.current_turn);
            setBattleLog(gs.battle_log);
            setWinner(gs.winner);
          }
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  // After every local board update, persist to Supabase
  const syncToSupabase = async (newBoard) => {
    await supabase.from('matches').update({
      game_state: { board: newBoard, phase, current_turn: currentTurn === 'host' ? 'guest' : 'host', battle_log: battleLog, winner },
    }).eq('id', id);
  };

  if (!match || !role) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">Loading match…</p>
      </div>
    );
  }

  // Waiting for opponent
  if (!match.guest_id && role === 'host') {
    return (
      <div className="container py-5">
        <div className="glass-panel p-5 text-center mt-4" style={{ maxWidth: 480, margin: '0 auto' }}>
          <h4 className="fw-bold mb-3">Waiting for Opponent</h4>
          <p className="text-muted">Share this lobby code with your friend:</p>
          <div style={{
            fontFamily: 'monospace', fontSize: '2rem', letterSpacing: '8px',
            fontWeight: 700, color: 'var(--system-blue)', margin: '1.5rem 0',
          }}>{lobbyCode}</div>
          <button className="btn btn-outline-danger btn-sm rounded-pill"
            onClick={async () => { await supabase.from('matches').update({ status: 'cancelled' }).eq('id', id); navigate('/lobbies'); }}>
            Cancel Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
        <h5 className="fw-bold mb-0">Active Match</h5>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Playing as <strong>{role}</strong></span>
      </div>

      {winner && (
        <div className={`alert ${winner === role ? 'alert-success' : 'alert-danger'} rounded-3 text-center mb-3`}>
          {winner === role ? '🏆 You Won!' : '💀 You were defeated.'}
          <button onClick={() => navigate('/lobbies')} className="btn btn-sm btn-link ms-3">Back to Lobbies</button>
        </div>
      )}

      <GameBoard
        board={board} setBoard={setBoard}
        phase={phase} setPhase={setPhase}
        currentTurn={currentTurn} setCurrentTurn={setCurrentTurn}
        playerRole={role}
        battleLog={battleLog} setBattleLog={setBattleLog}
        winner={winner} setWinner={setWinner}
        onMove={syncToSupabase}
      />
      <ChainOfCommand />
    </div>
  );
}
