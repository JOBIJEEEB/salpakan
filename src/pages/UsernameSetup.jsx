import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UserCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

// Validation rules
const MIN_LEN = 3;
const MAX_LEN = 20;
const VALID_PATTERN = /^[a-zA-Z0-9_]+$/;

function validate(value) {
  if (!value) return null; // empty — no error yet
  if (value.length < MIN_LEN) return `Too short — minimum ${MIN_LEN} characters.`;
  if (value.length > MAX_LEN) return `Too long — maximum ${MAX_LEN} characters.`;
  if (!VALID_PATTERN.test(value)) return 'Letters, numbers, and underscores only.';
  return null; // passes local validation
}

export default function UsernameSetup() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState(null);   // client-side validation
  const [serverError, setServerError] = useState(null); // supabase errors
  const [checking, setChecking] = useState(false);      // uniqueness debounce
  const [available, setAvailable] = useState(null);     // true | false | null
  const [submitting, setSubmitting] = useState(false);
  const isSettingUpRef = React.useRef(false);

  // Guards
  if (!user) return <Navigate to="/" replace />;
  // Only auto-redirect if they already have a username AND they aren't actively in the setup flow
  if (!profileLoading && profile?.username && !isSettingUpRef.current) {
    return <Navigate to="/lobbies" replace />;
  }

  // Debounced uniqueness check — fires 500ms after the user stops typing
  useEffect(() => {
    setAvailable(null);
    setServerError(null);

    const local = validate(username.trim());
    setLocalError(local);
    if (local || !username.trim()) return; // skip network check if locally invalid

    const timer = setTimeout(async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      setChecking(false);
      if (error) {
        setServerError('Could not verify username. Please try again.');
        return;
      }
      setAvailable(!data); // data === null means no existing record → available
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleChange = (e) => {
    setUsername(e.target.value);
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const trimmed = username.trim();

    // Re-run local validation as final guard
    const local = validate(trimmed);
    if (local) { setLocalError(local); return; }
    if (!available) { setServerError('That username is already taken.'); return; }

    setSubmitting(true);
    isSettingUpRef.current = true;
    
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, username: trimmed, email: user.email }, { onConflict: 'id' });

    if (upsertError) {
      // Catch unique constraint race condition
      if (upsertError.code === '23505') {
        setServerError('That username was just taken. Please try another one.');
      } else {
        setServerError(upsertError.message);
      }
      setSubmitting(false);
      isSettingUpRef.current = false;
      return;
    }

    await Swal.fire({
      title: 'Username Confirmed',
      text: `You are now known as @${trimmed}. Welcome to the game.`,
      icon: 'success',
      confirmButtonText: 'Start Playing',
      confirmButtonColor: '#007AFF',
      allowOutsideClick: false,
      customClass: {
        popup: 'apple-swal',
        title: 'apple-swal-title',
        confirmButton: 'apple-swal-confirm',
      }
    });

    await refreshProfile();
    
    // Hard redirect to bypass any unmount/react-router transition issues
    window.location.href = '/tutorial';
  };

  // Derived UI state
  const trimmed = username.trim();
  const isLocallyValid = trimmed.length >= MIN_LEN && !localError;
  const canSubmit = isLocallyValid && available === true && !checking && !submitting;

  // Input border colour feedback
  const inputBorderStyle = () => {
    if (!trimmed) return {};
    if (localError) return { borderColor: '#dc3545', boxShadow: '0 0 0 3px rgba(220,53,69,0.15)' };
    if (checking) return {};
    if (available === true) return { borderColor: '#198754', boxShadow: '0 0 0 3px rgba(25,135,84,0.15)' };
    if (available === false) return { borderColor: '#dc3545', boxShadow: '0 0 0 3px rgba(220,53,69,0.15)' };
    return {};
  };

  // Right-side icon inside the input row
  const StatusIcon = () => {
    if (!trimmed || localError) return null;
    if (checking) return <Loader size={18} color="#86868B" className="spin" />;
    if (available === true) return <CheckCircle size={18} color="#198754" />;
    if (available === false) return <XCircle size={18} color="#dc3545" />;
    return null;
  };

  // Friendly feedback line below the input
  const feedbackMessage = () => {
    if (localError) return { text: localError, color: '#dc3545' };
    if (serverError) return { text: serverError, color: '#dc3545' };
    if (checking) return { text: 'Checking availability…', color: '#86868B' };
    if (available === true) return { text: `@${trimmed} is available!`, color: '#198754' };
    if (available === false) return { text: 'That username is already taken.', color: '#dc3545' };
    if (!trimmed) return { text: `${MIN_LEN}–${MAX_LEN} characters · letters, numbers, underscores`, color: '#86868B' };
    return null;
  };

  const fb = feedbackMessage();

  return (
    <>
      {/* Inline spinner style */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
      `}</style>

      <div className="page-container fit-screen">
        <div className="container h-100 d-flex align-items-center justify-content-center">
          <div className="col-md-5 col-lg-4">
            <div className="glass-panel p-4 p-sm-5 text-center shadow-lg">

              {/* Avatar icon */}
              <div className="d-flex justify-content-center mb-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 72, height: 72, background: 'rgba(0,122,255,0.1)' }}
                >
                  <UserCircle size={40} color="var(--system-blue)" />
                </div>
              </div>

              <h2 className="fw-bold mb-2" style={{ letterSpacing: '-0.5px' }}>Choose a Username</h2>
              <p className="text-muted mb-4" style={{ fontSize: '0.95rem' }}>
                Pick your display name. This is how other players will identify you.
              </p>

              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3" noValidate>

                {/* Input with inline status icon */}
                <div className="position-relative">
                  <input
                    type="text"
                    className="apple-input text-center"
                    placeholder="your_username"
                    value={username}
                    onChange={handleChange}
                    maxLength={MAX_LEN}
                    autoFocus
                    autoComplete="off"
                    style={{ paddingRight: '2.5rem', ...inputBorderStyle() }}
                  />
                  <div
                    className="position-absolute top-50 end-0 translate-middle-y pe-3 d-flex"
                    style={{ pointerEvents: 'none' }}
                  >
                    <StatusIcon />
                  </div>
                </div>

                {/* Feedback line */}
                {fb && (
                  <p className="mb-0 text-start" style={{ fontSize: '0.78rem', color: fb.color, marginTop: '-6px' }}>
                    {fb.text}
                  </p>
                )}

                <button
                  type="submit"
                  className="apple-btn-primary mt-1"
                  disabled={!canSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.5, transition: 'opacity 0.2s' }}
                >
                  {submitting ? 'Saving…' : 'Confirm Username'}
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
